import { describe, it, expect, vi } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import { PaymentsService } from "../../../../src/features/payments/payments.service.js";
import {
  PaymentAlreadyPaidError,
  PaymentAlreadyPendingError,
  PaymentCustomerIncompleteError,
  PaymentNotRefundableError,
  RefundExceedsRemainderError,
  PaymentProviderError,
  PaymentProviderTimeout,
} from "../../../../src/features/payments/payments.errors.js";
import { BookingAlreadyCancelledError } from "../../../../src/features/bookings/index.js";
import {
  NotFoundError,
  ProviderError,
  ProviderTimeout,
} from "../../../../src/shared/errors/http-errors.js";

function baseBooking(overrides = {}) {
  return {
    id: "bk1",
    reference: "TS-ABCDEF",
    status: "pending",
    currency: "IDR",
    totalAmount: new Decimal("166500.00"),
    subtotalAmount: new Decimal("150000.00"),
    taxAmount: new Decimal("16500.00"),
    durationHours: new Decimal("3.00"),
    bookingDate: new Date("2026-09-15T00:00:00.000Z"),
    startTime: new Date("1970-01-01T09:00:00.000Z"),
    endTime: new Date("1970-01-01T12:00:00.000Z"),
    user: { id: "u1", name: "Ana", email: "ana@test.com", phone: "+62811" },
    workspace: { name: "Room A", location: { name: "HQ", timezone: "UTC" } },
    ...overrides,
  };
}

/** @param {{ repo?: object, bookings?: object, paybridge?: object }} [overrides] */
function makeService(overrides = {}) {
  const repo = {
    findLatestForBooking: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((data) =>
      Promise.resolve({
        id: "pay1",
        createdAt: new Date(),
        checkoutUrl: data.checkoutUrl,
        ...data,
      }),
    ),
    findById: vi.fn(),
    findByIdAdmin: vi.fn(),
    findAllAdmin: vi.fn(),
    sumSucceededRefunds: vi.fn().mockResolvedValue(0n),
    createRefund: vi
      .fn()
      .mockImplementation((data) =>
        Promise.resolve({ id: "ref1", createdAt: new Date(), ...data }),
      ),
    update: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    findByOrderId: vi.fn(),
    transaction: vi.fn().mockImplementation((run) => run({})),
    findStalePendingBookings: vi.fn().mockResolvedValue([]),
    findReplayableEvents: vi.fn().mockResolvedValue([]),
    findReconcilable: vi.fn().mockResolvedValue([]),
    ...overrides.repo,
  };
  const bookings = {
    getOwnedById: vi.fn().mockResolvedValue(baseBooking()),
    getByReference: vi.fn(),
    confirmFromPayment: vi.fn(),
    setPaymentFailed: vi.fn(),
    cancelFromPaymentExpiry: vi.fn(),
    ...overrides.bookings,
  };
  const paybridge = {
    createCharge: vi.fn().mockResolvedValue({
      id: "sess_1",
      orderId: "TSPC-1-3-abc",
      checkoutUrl: "https://pay.test/checkout/sess_1",
    }),
    createRefund: vi.fn().mockResolvedValue({ id: "refund_1" }),
    listPaymentMethods: vi
      .fn()
      .mockResolvedValue([
        { code: "OVO", name: "OVO", category: "e_wallet", docsUrl: "https://x" },
      ]),
    getCharge: vi.fn(),
    ...overrides.paybridge,
  };
  const service = new PaymentsService({
    paymentsRepository: repo,
    bookingsService: bookings,
    paybridgeClient: paybridge,
  });
  return { service, repo, bookings, paybridge };
}

describe("PaymentsService.createCharge", () => {
  it("propagates NotFoundError for a booking not owned by the user", async () => {
    const { service, bookings } = makeService({
      bookings: {
        getOwnedById: vi.fn().mockRejectedValue(new NotFoundError("Booking not found.")),
      },
    });
    await expect(service.createCharge("u1", "bk1", { provider: "xendit" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(bookings.getOwnedById).toHaveBeenCalledWith("u1", "bk1");
  });

  it("throws BookingAlreadyCancelledError for a cancelled booking", async () => {
    const { service } = makeService({
      bookings: { getOwnedById: vi.fn().mockResolvedValue(baseBooking({ status: "cancelled" })) },
    });
    await expect(service.createCharge("u1", "bk1", { provider: "xendit" })).rejects.toBeInstanceOf(
      BookingAlreadyCancelledError,
    );
  });

  it("throws PaymentCustomerIncompleteError when the user has no phone", async () => {
    const { service } = makeService({
      bookings: {
        getOwnedById: vi
          .fn()
          .mockResolvedValue(baseBooking({ user: { ...baseBooking().user, phone: null } })),
      },
    });
    await expect(service.createCharge("u1", "bk1", { provider: "xendit" })).rejects.toBeInstanceOf(
      PaymentCustomerIncompleteError,
    );
  });

  it("throws PaymentAlreadyPaidError when a paid payment already exists", async () => {
    const { service } = makeService({
      repo: { findLatestForBooking: vi.fn().mockResolvedValue({ status: "paid" }) },
    });
    await expect(service.createCharge("u1", "bk1", { provider: "xendit" })).rejects.toBeInstanceOf(
      PaymentAlreadyPaidError,
    );
  });

  it("throws PaymentAlreadyPendingError when a checkout session is already live", async () => {
    const { service } = makeService({
      repo: { findLatestForBooking: vi.fn().mockResolvedValue({ status: "awaiting_payment" }) },
    });
    await expect(service.createCharge("u1", "bk1", { provider: "xendit" })).rejects.toBeInstanceOf(
      PaymentAlreadyPendingError,
    );
  });

  it("computes amountMinor from the booking's snapshotted total (REG-010-adjacent: IDR exponent 0)", async () => {
    const { service, paybridge, repo } = makeService();
    const dto = await service.createCharge("u1", "bk1", { provider: "xendit" });

    expect(paybridge.createCharge).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 166500, currency: "IDR" }),
    );
    const created = repo.create.mock.calls[0][0];
    expect(created.amountMinor).toBe(166500n);
    expect(dto.amountMinor).toBe(166500);
    expect(dto.amount).toBe("166500.00");
  });

  it("items sum to the total amount (subtotal + tax)", async () => {
    const { service, paybridge } = makeService();
    await service.createCharge("u1", "bk1", { provider: "xendit" });

    const [[payload]] = paybridge.createCharge.mock.calls;
    const itemSum = payload.items.reduce((sum, item) => sum + item.price, 0);
    expect(itemSum).toBe(payload.amount);
  });
});

describe("PaymentsService.getPaymentStatus", () => {
  it("throws NotFoundError when no payment exists for the booking", async () => {
    const { service, bookings, repo } = makeService({
      bookings: {
        getByReference: vi
          .fn()
          .mockResolvedValue({ id: "bk1", reference: "TS-ABCDEF", status: "pending" }),
      },
      repo: { findLatestForBooking: vi.fn().mockResolvedValue(null) },
    });
    await expect(service.getPaymentStatus("u1", "TS-ABCDEF")).rejects.toBeInstanceOf(NotFoundError);
    expect(repo.findLatestForBooking).toHaveBeenCalledWith("bk1");
  });
});

describe("PaymentsService.processWebhook", () => {
  it("returns verified:false without recording anything when the signature is invalid", async () => {
    const { service, repo } = makeService();
    const result = await service.processWebhook({
      method: "POST",
      path: "/webhooks/paybridge",
      rawBody: "{}",
      headers: {},
    });
    expect(result.verified).toBe(false);
    expect(repo.createEvent).not.toHaveBeenCalled();
  });
});

describe("PaymentsService.refund", () => {
  it("throws NotFoundError for an unknown payment", async () => {
    const { service } = makeService({ repo: { findById: vi.fn().mockResolvedValue(null) } });
    await expect(service.refund("pay1", {}, "admin1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws PaymentNotRefundableError when the payment isn't paid", async () => {
    const { service } = makeService({
      repo: {
        findById: vi.fn().mockResolvedValue({
          id: "pay1",
          status: "pending",
          amountMinor: 100000n,
          currency: "IDR",
        }),
      },
    });
    await expect(service.refund("pay1", {}, "admin1")).rejects.toBeInstanceOf(
      PaymentNotRefundableError,
    );
  });

  it("throws RefundExceedsRemainderError above the unrefunded balance", async () => {
    const { service } = makeService({
      repo: {
        findById: vi
          .fn()
          .mockResolvedValue({ id: "pay1", status: "paid", amountMinor: 100000n, currency: "IDR" }),
        sumSucceededRefunds: vi.fn().mockResolvedValue(0n),
      },
    });
    await expect(service.refund("pay1", { amount: "150000.00" }, "admin1")).rejects.toBeInstanceOf(
      RefundExceedsRemainderError,
    );
  });

  it("defaults amount to the full unrefunded remainder and sets status refunded", async () => {
    const { service, repo, paybridge } = makeService({
      repo: {
        findById: vi.fn().mockResolvedValue({
          id: "pay1",
          status: "paid",
          amountMinor: 100000n,
          currency: "IDR",
          paybridgeChargeId: "sess_1",
        }),
        sumSucceededRefunds: vi.fn().mockResolvedValue(0n),
      },
    });
    const dto = await service.refund("pay1", {}, "admin1");

    expect(paybridge.createRefund).toHaveBeenCalledWith(
      expect.objectContaining({ chargeId: "sess_1", amount: 100000 }),
    );
    expect(repo.update).toHaveBeenCalledWith("pay1", { status: "refunded" });
    expect(dto.payment.status).toBe("refunded");
    expect(dto.payment.remainingAmount).toBe("0.00");
  });

  it("sets status partially_refunded when a balance remains", async () => {
    const { service, repo } = makeService({
      repo: {
        findById: vi.fn().mockResolvedValue({
          id: "pay1",
          status: "paid",
          amountMinor: 100000n,
          currency: "IDR",
          paybridgeChargeId: "sess_1",
        }),
        sumSucceededRefunds: vi.fn().mockResolvedValue(0n),
      },
    });
    const dto = await service.refund("pay1", { amount: "40000.00" }, "admin1");

    expect(repo.update).toHaveBeenCalledWith("pay1", { status: "partially_refunded" });
    expect(dto.payment.status).toBe("partially_refunded");
    expect(dto.payment.remainingAmount).toBe("60000.00");
  });
});

describe("PaymentsService.sweepStalePending", () => {
  it("expires the stale payment and releases the booking for each stale-pending booking", async () => {
    const { service, repo, bookings } = makeService({
      repo: {
        findStalePendingBookings: vi.fn().mockResolvedValue([{ id: "bk1" }, { id: "bk2" }]),
        findLatestForBooking: vi.fn().mockResolvedValue({ id: "pay1", status: "awaiting_payment" }),
      },
    });

    const result = await service.sweepStalePending(30);

    expect(result).toEqual({ swept: 2 });
    expect(repo.update).toHaveBeenCalledWith("pay1", {
      status: "expired",
      expiredAt: expect.any(Date),
    });
    expect(bookings.cancelFromPaymentExpiry).toHaveBeenCalledWith("bk1");
    expect(bookings.cancelFromPaymentExpiry).toHaveBeenCalledWith("bk2");
  });

  it("releases the booking even when it has no payment at all", async () => {
    const { service, repo, bookings } = makeService({
      repo: {
        findStalePendingBookings: vi.fn().mockResolvedValue([{ id: "bk1" }]),
        findLatestForBooking: vi.fn().mockResolvedValue(null),
      },
    });

    await service.sweepStalePending(30);

    expect(repo.update).not.toHaveBeenCalled();
    expect(bookings.cancelFromPaymentExpiry).toHaveBeenCalledWith("bk1");
  });

  it("leaves an already-resolved payment (e.g. paid) untouched", async () => {
    const { service, repo } = makeService({
      repo: {
        findStalePendingBookings: vi.fn().mockResolvedValue([{ id: "bk1" }]),
        findLatestForBooking: vi.fn().mockResolvedValue({ id: "pay1", status: "paid" }),
      },
    });

    await service.sweepStalePending(30);

    expect(repo.update).not.toHaveBeenCalled();
  });

  it("returns swept: 0 when nothing is stale", async () => {
    const { service } = makeService();
    const result = await service.sweepStalePending(30);
    expect(result).toEqual({ swept: 0 });
  });
});

describe("PaymentsService.replayFailedEvents", () => {
  it("reprocesses a stuck event through the same logic a live webhook would use", async () => {
    const payment = {
      id: "pay1",
      bookingId: "bk1",
      amountMinor: 166500n,
      currency: "IDR",
      status: "pending",
    };
    const event = {
      id: "evt1",
      rawBody: JSON.stringify({
        event: "payment_succeeded",
        orderId: "TSPC-1-3-abc",
        amount: 166500,
        currency: "IDR",
      }),
    };
    const { service, repo, bookings } = makeService({
      repo: {
        findReplayableEvents: vi.fn().mockResolvedValue([event]),
        findByOrderId: vi.fn().mockResolvedValue(payment),
      },
    });

    const result = await service.replayFailedEvents(5);

    expect(result).toEqual({ replayed: 1 });
    expect(repo.update).toHaveBeenCalledWith(
      "pay1",
      { status: "paid", paidAt: expect.any(Date) },
      expect.anything(),
    );
    expect(bookings.confirmFromPayment).toHaveBeenCalledWith("bk1", expect.anything());
    expect(repo.updateEvent).toHaveBeenCalledWith(
      "evt1",
      expect.objectContaining({ status: "processed" }),
    );
  });

  it("marks the event failed again, rather than throwing, when reprocessing itself errors", async () => {
    const event = { id: "evt1", rawBody: "not valid json" };
    const { service, repo } = makeService({
      repo: { findReplayableEvents: vi.fn().mockResolvedValue([event]) },
    });

    const result = await service.replayFailedEvents(5);

    expect(result).toEqual({ replayed: 1 });
    expect(repo.updateEvent).toHaveBeenCalledWith(
      "evt1",
      expect.objectContaining({ status: "failed" }),
    );
  });

  it("returns replayed: 0 when nothing is stuck", async () => {
    const { service } = makeService();
    const result = await service.replayFailedEvents(5);
    expect(result).toEqual({ replayed: 0 });
  });
});

describe("PaymentsService.reconcile", () => {
  it("corrects a payment PayBridge reports as paid but we still show pending", async () => {
    const payment = {
      id: "pay1",
      bookingId: "bk1",
      paybridgeChargeId: "sess_1",
      status: "pending",
    };
    const { service, repo, bookings, paybridge } = makeService({
      repo: { findReconcilable: vi.fn().mockResolvedValue([payment]) },
      paybridge: { getCharge: vi.fn().mockResolvedValue({ status: "paid" }) },
    });

    const result = await service.reconcile(60);

    expect(result).toEqual({ checked: 1, corrected: 1 });
    expect(repo.update).toHaveBeenCalledWith("pay1", {
      status: "paid",
      paidAt: expect.any(Date),
    });
    expect(bookings.confirmFromPayment).toHaveBeenCalledWith("bk1");
  });

  it("does nothing when PayBridge agrees with our own status", async () => {
    const payment = { id: "pay1", bookingId: "bk1", paybridgeChargeId: "sess_1", status: "failed" };
    const { service, repo } = makeService({
      repo: { findReconcilable: vi.fn().mockResolvedValue([payment]) },
      paybridge: { getCharge: vi.fn().mockResolvedValue({ status: "failed" }) },
    });

    const result = await service.reconcile(60);

    expect(result).toEqual({ checked: 1, corrected: 0 });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("skips a payment PayBridge can't currently be reached for, without throwing", async () => {
    const payment = {
      id: "pay1",
      bookingId: "bk1",
      paybridgeChargeId: "sess_1",
      status: "pending",
    };
    const { service, repo } = makeService({
      repo: { findReconcilable: vi.fn().mockResolvedValue([payment]) },
      paybridge: { getCharge: vi.fn().mockRejectedValue(new Error("network blip")) },
    });

    const result = await service.reconcile(60);

    expect(result).toEqual({ checked: 1, corrected: 0 });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("returns checked: 0 when nothing needs reconciling", async () => {
    const { service } = makeService();
    const result = await service.reconcile(60);
    expect(result).toEqual({ checked: 0, corrected: 0 });
  });
});

describe("PaymentsService.listPaymentMethods", () => {
  // Each test uses its own provider string — `paymentMethodsCache` is
  // module-level, shared across every PaymentsService instance in this
  // file, so reusing a key would let one test's cache hit mask another's.
  it("fetches and caches on a cache miss", async () => {
    const { service, paybridge } = makeService();

    const result = await service.listPaymentMethods("xendit-miss");

    expect(paybridge.listPaymentMethods).toHaveBeenCalledWith("xendit-miss");
    expect(result).toEqual({
      provider: "xendit-miss",
      data: [{ code: "OVO", name: "OVO", category: "e_wallet" }],
    });
  });

  it("serves the cache on a second call, without a second round trip", async () => {
    const { service, paybridge } = makeService();

    await service.listPaymentMethods("xendit-cache-hit");
    await service.listPaymentMethods("xendit-cache-hit");

    expect(paybridge.listPaymentMethods).toHaveBeenCalledTimes(1);
  });

  it("translates a provider timeout into PaymentProviderTimeout", async () => {
    const { service } = makeService({
      paybridge: { listPaymentMethods: vi.fn().mockRejectedValue(new ProviderTimeout("slow")) },
    });
    await expect(service.listPaymentMethods("midtrans")).rejects.toBeInstanceOf(
      PaymentProviderTimeout,
    );
  });

  it("translates a generic provider error into PaymentProviderError", async () => {
    const { service } = makeService({
      paybridge: { listPaymentMethods: vi.fn().mockRejectedValue(new ProviderError("down")) },
    });
    await expect(service.listPaymentMethods("ovo-provider")).rejects.toBeInstanceOf(
      PaymentProviderError,
    );
  });
});

describe("PaymentsService.createCharge — provider failure translation", () => {
  it("translates a provider timeout from PayBridge's charge creation", async () => {
    const { service } = makeService({
      paybridge: { createCharge: vi.fn().mockRejectedValue(new ProviderTimeout("slow")) },
    });
    await expect(service.createCharge("u1", "bk1", { provider: "xendit" })).rejects.toBeInstanceOf(
      PaymentProviderTimeout,
    );
  });
});

describe("PaymentsService.refund — provider failure translation", () => {
  it("translates a provider error from PayBridge's refund creation", async () => {
    const { service } = makeService({
      repo: {
        findById: vi
          .fn()
          .mockResolvedValue({ id: "pay1", status: "paid", amountMinor: 100000n, currency: "IDR" }),
        sumSucceededRefunds: vi.fn().mockResolvedValue(0n),
      },
      paybridge: { createRefund: vi.fn().mockRejectedValue(new ProviderError("down")) },
    });
    await expect(service.refund("pay1", {}, "admin1")).rejects.toBeInstanceOf(PaymentProviderError);
  });
});

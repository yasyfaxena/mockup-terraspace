import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../../../src/app.js";
import { prisma } from "../../../../src/shared/database/client.js";
import { seedBooking } from "../../../factories/booking.factory.js";
import { seedPayment } from "../../../factories/payment.factory.js";
import { mockPlatformKey, signWebhook } from "../../../helpers/paybridge.js";
import { resetPlatformKeyCache } from "../../../../src/features/payments/paybridge.verifier.js";

const WEBHOOK_PATH = "/webhooks/paybridge";

beforeEach(() => {
  resetPlatformKeyCache();
});

/** Seeds a `pending` booking with a matching `pending` payment, ready for a webhook to resolve. */
async function seedPendingCharge(overrides = {}) {
  const booking = await seedBooking({ status: "pending" });
  const payment = await seedPayment({
    bookingId: booking.id,
    status: "pending",
    ...overrides,
  });
  return { booking, payment };
}

function chargeBody(payment, event = "payment_succeeded", amountOverride) {
  return JSON.stringify({
    event,
    orderId: payment.paybridgeOrderId,
    amount: amountOverride ?? Number(payment.amountMinor),
    currency: payment.currency,
    provider: payment.provider,
    timestamp: new Date().toISOString(),
  });
}

async function postWebhook(rawBody, headers) {
  return request(app)
    .post(WEBHOOK_PATH)
    .set("Content-Type", "application/json")
    .set(headers)
    .send(rawBody);
}

describe("POST /webhooks/paybridge (payments.md §7)", () => {
  it("valid signature + payment_succeeded confirms the booking and marks the payment paid", async () => {
    const { booking, payment } = await seedPendingCharge();
    mockPlatformKey();
    const rawBody = chargeBody(payment);
    const headers = signWebhook(rawBody, WEBHOOK_PATH);

    const res = await postWebhook(rawBody, headers);

    expect(res.status).toBe(200);
    const persistedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(persistedPayment.status).toBe("paid");
    expect(persistedPayment.paidAt).not.toBeNull();
    const persistedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(persistedBooking.status).toBe("confirmed");
    expect(persistedBooking.paymentStatus).toBe("paid");
  });

  it("rejects a tampered body — signature was computed over different bytes (REG-012)", async () => {
    const { payment } = await seedPendingCharge();
    mockPlatformKey();
    const rawBody = chargeBody(payment);
    const headers = signWebhook(rawBody, WEBHOOK_PATH);
    const tamperedBody = JSON.stringify(JSON.parse(rawBody), null, 2);

    const res = await postWebhook(tamperedBody, headers);

    expect(res.status).toBe(401);
    const persistedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(persistedPayment.status).toBe("pending");
  });

  it("rejects a signature claiming a key id that isn't the cached platform key", async () => {
    const { payment } = await seedPendingCharge();
    mockPlatformKey();
    const rawBody = chargeBody(payment);
    const headers = signWebhook(rawBody, WEBHOOK_PATH);

    const res = await postWebhook(rawBody, { ...headers, "x-key-id": "some-other-key" });

    expect(res.status).toBe(401);
  });

  it("a replayed delivery (identical nonce) is a 200 no-op — booking confirmed once (REG-011-adjacent)", async () => {
    const { booking, payment } = await seedPendingCharge();
    mockPlatformKey();
    const rawBody = chargeBody(payment);
    const headers = signWebhook(rawBody, WEBHOOK_PATH);

    const first = await postWebhook(rawBody, headers);
    expect(first.status).toBe(200);

    const second = await postWebhook(rawBody, headers);
    expect(second.status).toBe(200);

    const persistedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(persistedBooking.status).toBe("confirmed");
    const events = await prisma.paymentEvent.findMany({
      where: { paybridgeOrderId: payment.paybridgeOrderId },
    });
    expect(events).toHaveLength(1);
  });

  it("a duplicate delivery (same orderId+event, fresh nonce) is a 200 no-op — one payments row paid (REG-011)", async () => {
    const { booking, payment } = await seedPendingCharge();
    mockPlatformKey();
    const rawBody = chargeBody(payment);
    const first = await postWebhook(rawBody, signWebhook(rawBody, WEBHOOK_PATH));
    expect(first.status).toBe(200);

    mockPlatformKey();
    const second = await postWebhook(rawBody, signWebhook(rawBody, WEBHOOK_PATH));
    expect(second.status).toBe(200);

    const persistedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(persistedBooking.status).toBe("confirmed");
    const paidPayments = await prisma.payment.findMany({
      where: { bookingId: booking.id, status: "paid" },
    });
    expect(paidPayments).toHaveLength(1);
    const events = await prisma.paymentEvent.findMany({
      where: { paybridgeOrderId: payment.paybridgeOrderId },
    });
    expect(events).toHaveLength(1); // the second delivery's insert lost the (orderId, event) unique race
  });

  it("an unknown orderId is a 200 (never a 4xx that would trigger pointless retries) and is recorded ignored", async () => {
    mockPlatformKey();
    const rawBody = JSON.stringify({
      event: "payment_succeeded",
      orderId: "TSPC-does-not-exist",
      amount: 1000,
      currency: "IDR",
      provider: "xendit",
      timestamp: new Date().toISOString(),
    });
    const headers = signWebhook(rawBody, WEBHOOK_PATH);

    const res = await postWebhook(rawBody, headers);

    expect(res.status).toBe(200);
    const event = await prisma.paymentEvent.findFirst({
      where: { paybridgeOrderId: "TSPC-does-not-exist" },
    });
    expect(event.status).toBe("ignored");
    expect(event.paymentId).toBeNull();
  });

  it("an amount mismatch never marks the payment paid — the only defence against a tampered charge", async () => {
    const { booking, payment } = await seedPendingCharge();
    mockPlatformKey();
    const rawBody = chargeBody(payment, "payment_succeeded", Number(payment.amountMinor) + 1);
    const headers = signWebhook(rawBody, WEBHOOK_PATH);

    const res = await postWebhook(rawBody, headers);

    expect(res.status).toBe(200);
    const persistedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(persistedPayment.status).toBe("pending");
    const persistedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(persistedBooking.status).toBe("pending");
    const event = await prisma.paymentEvent.findFirst({
      where: { paybridgeOrderId: payment.paybridgeOrderId },
    });
    expect(event.status).toBe("failed");
  });

  it("payment_failed keeps the booking pending so the customer can retry", async () => {
    const { booking, payment } = await seedPendingCharge();
    mockPlatformKey();
    const rawBody = chargeBody(payment, "payment_failed");
    const headers = signWebhook(rawBody, WEBHOOK_PATH);

    const res = await postWebhook(rawBody, headers);

    expect(res.status).toBe(200);
    const persistedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(persistedPayment.status).toBe("failed");
    const persistedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(persistedBooking.status).toBe("pending");
    expect(persistedBooking.paymentStatus).toBe("failed");
  });

  it("payment_expired cancels the booking, releasing the slot", async () => {
    const { booking, payment } = await seedPendingCharge();
    mockPlatformKey();
    const rawBody = chargeBody(payment, "payment_expired");
    const headers = signWebhook(rawBody, WEBHOOK_PATH);

    const res = await postWebhook(rawBody, headers);

    expect(res.status).toBe(200);
    const persistedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(persistedPayment.status).toBe("expired");
    const persistedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(persistedBooking.status).toBe("cancelled");
  });

  it("a validly-signed but unparseable body is a 200 no-op — never acted on, only logged", async () => {
    mockPlatformKey();
    const rawBody = "{not valid json";
    const headers = signWebhook(rawBody, WEBHOOK_PATH);

    const res = await postWebhook(rawBody, headers);

    expect(res.status).toBe(200);
  });

  it("an unrecognized event type is ignored rather than acted on", async () => {
    const { booking, payment } = await seedPendingCharge();
    mockPlatformKey();
    const rawBody = chargeBody(payment, "some_future_event_type");
    const headers = signWebhook(rawBody, WEBHOOK_PATH);

    const res = await postWebhook(rawBody, headers);

    expect(res.status).toBe(200);
    const persistedPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(persistedPayment.status).toBe("pending");
    const persistedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(persistedBooking.status).toBe("pending");
    const event = await prisma.paymentEvent.findFirst({
      where: { paybridgeOrderId: payment.paybridgeOrderId },
    });
    expect(event.status).toBe("ignored");
  });

  it("a genuine processing exception is a 200 no-op — the event is queued failed for replay, not thrown", async () => {
    const { payment } = await seedPendingCharge();
    mockPlatformKey();
    // A non-numeric amount makes BigInt(body.amount) throw mid-processing —
    // proves an unexpected exception never surfaces as a 5xx to PayBridge,
    // which would burn its limited retry budget for nothing (payments.md §7).
    const rawBody = JSON.stringify({
      event: "payment_succeeded",
      orderId: payment.paybridgeOrderId,
      amount: "not-a-number",
      currency: payment.currency,
      provider: payment.provider,
      timestamp: new Date().toISOString(),
    });
    const headers = signWebhook(rawBody, WEBHOOK_PATH);

    const res = await postWebhook(rawBody, headers);

    expect(res.status).toBe(200);
    const event = await prisma.paymentEvent.findFirst({
      where: { paybridgeOrderId: payment.paybridgeOrderId },
    });
    expect(event.status).toBe("failed");
    expect(event.error).toBeTruthy();
  });
});

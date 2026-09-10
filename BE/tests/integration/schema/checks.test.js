import { describe, it, expect } from "vitest";
import { prisma } from "../../../src/shared/database/client.js";
import { seedLocation } from "../../factories/location.factory.js";
import { seedWorkspace } from "../../factories/workspace.factory.js";
import { seedUser } from "../../factories/user.factory.js";
import { buildBooking } from "../../factories/booking.factory.js";

/**
 * Every CHECK is proven by a test that violates it (erd-spec.md §8–15).
 * A structured call like `.create()` surfaces a CHECK violation as a
 * `PrismaClientUnknownRequestError` with no `.code`/`.meta` — the SQLSTATE
 * only appears in the formatted message (see prisma-mapper.js).
 */
async function expectCheckViolation(promise) {
  await expect(promise).rejects.toThrow(/23514/);
}

describe("locations CHECK constraints", () => {
  it("rejects a latitude outside -90..90", async () => {
    await expectCheckViolation(seedLocation({ latitude: 91 }));
  });

  it("rejects a longitude outside -180..180", async () => {
    await expectCheckViolation(seedLocation({ longitude: 181 }));
  });

  it("rejects a non-positive access radius", async () => {
    await expectCheckViolation(seedLocation({ accessRadiusMeters: 0 }));
  });
});

describe("workspaces CHECK constraints", () => {
  it("rejects a negative price_per_hour", async () => {
    await expectCheckViolation(seedWorkspace({ pricePerHour: "-1.00" }));
  });
});

describe("bookings CHECK constraints", () => {
  async function makeBookingRow() {
    const [workspace, user] = await Promise.all([seedWorkspace(), seedUser()]);
    return { workspaceId: workspace.id, userId: user.id };
  }

  it("rejects start_time >= end_time", async () => {
    const { workspaceId, userId } = await makeBookingRow();
    await expectCheckViolation(
      prisma.booking.create({
        data: {
          ...buildBooking({ workspaceId, startTime: "10:00", endTime: "10:00" }),
          userId,
        },
      }),
    );
  });

  it("rejects a duration under 30 minutes", async () => {
    const { workspaceId, userId } = await makeBookingRow();
    await expectCheckViolation(
      prisma.booking.create({
        data: {
          ...buildBooking({ workspaceId, startTime: "09:00", endTime: "09:15" }),
          userId,
        },
      }),
    );
  });

  it("rejects a negative unit_price", async () => {
    const { workspaceId, userId } = await makeBookingRow();
    await expectCheckViolation(
      prisma.booking.create({
        data: { ...buildBooking({ workspaceId }), userId, unitPrice: -1 },
      }),
    );
  });

  it("rejects a total_amount that does not equal subtotal + tax", async () => {
    const { workspaceId, userId } = await makeBookingRow();
    await expectCheckViolation(
      prisma.booking.create({
        data: { ...buildBooking({ workspaceId }), userId, totalAmount: 1 },
      }),
    );
  });

  it("rejects cancelledAt set without status='cancelled'", async () => {
    const { workspaceId, userId } = await makeBookingRow();
    await expectCheckViolation(
      prisma.booking.create({
        data: {
          ...buildBooking({ workspaceId }),
          userId,
          status: "confirmed",
          cancelledAt: new Date(),
        },
      }),
    );
  });

  it("rejects status='cancelled' without cancelledAt", async () => {
    const { workspaceId, userId } = await makeBookingRow();
    await expectCheckViolation(
      prisma.booking.create({
        data: { ...buildBooking({ workspaceId }), userId, status: "cancelled" },
      }),
    );
  });
});

describe("admin_settings CHECK constraints", () => {
  it("rejects a row whose id is not true", async () => {
    await expectCheckViolation(
      // @ts-expect-error — id is deliberately invalid to prove the CHECK
      prisma.adminSettings.create({ data: { id: false } }),
    );
  });

  it("rejects a tax_percent outside 0..100", async () => {
    await expectCheckViolation(
      prisma.adminSettings.update({ where: { id: true }, data: { taxPercent: "101.00" } }),
    );
  });

  it("rejects a negative cancellation_window_hours", async () => {
    await expectCheckViolation(
      prisma.adminSettings.update({ where: { id: true }, data: { cancellationWindowHours: -1 } }),
    );
  });

  it("rejects a negative advance_booking_days", async () => {
    await expectCheckViolation(
      prisma.adminSettings.update({ where: { id: true }, data: { advanceBookingDays: -1 } }),
    );
  });

  it("rejects a currency that is not 3 uppercase letters", async () => {
    await expectCheckViolation(
      prisma.adminSettings.update({ where: { id: true }, data: { currency: "idr" } }),
    );
  });
});

describe("payments and refunds CHECK constraints", () => {
  it("rejects a non-positive amount_minor on payments", async () => {
    const [workspace, user] = await Promise.all([seedWorkspace(), seedUser()]);
    const booking = await prisma.booking.create({
      data: { ...buildBooking({ workspaceId: workspace.id }), userId: user.id },
    });

    await expectCheckViolation(
      prisma.payment.create({
        data: {
          bookingId: booking.id,
          provider: "xendit",
          paybridgeChargeId: `charge-${booking.id}`,
          paybridgeOrderId: `order-${booking.id}`,
          amountMinor: 0,
          currency: "IDR",
        },
      }),
    );
  });

  it("rejects a non-positive amount_minor on refunds", async () => {
    const [workspace, user] = await Promise.all([seedWorkspace(), seedUser()]);
    const booking = await prisma.booking.create({
      data: { ...buildBooking({ workspaceId: workspace.id }), userId: user.id },
    });
    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: "xendit",
        paybridgeChargeId: `charge-${booking.id}`,
        paybridgeOrderId: `order-${booking.id}`,
        amountMinor: 166500,
        currency: "IDR",
        status: "paid",
      },
    });

    await expectCheckViolation(
      prisma.refund.create({
        data: {
          paymentId: payment.id,
          paybridgeRefundId: `refund-${payment.id}`,
          amountMinor: 0,
          status: "pending",
          requestedBy: user.id,
        },
      }),
    );
  });
});

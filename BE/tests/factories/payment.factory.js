import { randomUUID } from "node:crypto";
import { prisma } from "../../src/shared/database/client.js";
import { seedBooking } from "./booking.factory.js";
import { seedUser } from "./user.factory.js";

let counter = 0;

/** @param {Partial<import("@prisma/client").Payment>} [overrides] */
export function buildPayment(overrides = {}) {
  counter += 1;
  const suffix = `${counter}${randomUUID().slice(0, 8)}`;
  return {
    provider: "xendit",
    paybridgeChargeId: `sess_${suffix}`,
    paybridgeOrderId: `TSPC-1-3-${suffix}`,
    amountMinor: 166500n,
    currency: "IDR",
    status: "pending",
    checkoutUrl: `https://pay.test/checkout/sess_${suffix}`,
    ...overrides,
  };
}

/** Persists, creating a booking when `bookingId` is not supplied. */
export async function seedPayment(overrides = {}) {
  const { bookingId, ...rest } = overrides;
  const resolvedBookingId = bookingId ?? (await seedBooking()).id;
  return prisma.payment.create({
    data: { ...buildPayment(rest), bookingId: resolvedBookingId },
  });
}

/**
 * Persists a `succeeded` refund, creating a `paid` payment (and its
 * booking) when `paymentId` is not supplied.
 * @param {Partial<import("@prisma/client").Refund> & { paymentId?: string }} [overrides]
 */
export async function seedRefund(overrides = {}) {
  const { paymentId, requestedBy, ...rest } = overrides;
  const resolvedPaymentId = paymentId ?? (await seedPayment({ status: "paid" })).id;
  const resolvedRequestedBy = requestedBy ?? (await seedUser()).id;
  return prisma.refund.create({
    data: {
      paybridgeRefundId: `refund_${randomUUID()}`,
      amountMinor: 10000n,
      status: "succeeded",
      ...rest,
      paymentId: resolvedPaymentId,
      requestedBy: resolvedRequestedBy,
    },
  });
}

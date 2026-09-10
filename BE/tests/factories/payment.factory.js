import { randomUUID } from "node:crypto";
import { prisma } from "../../src/shared/database/client.js";
import { seedBooking } from "./booking.factory.js";

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

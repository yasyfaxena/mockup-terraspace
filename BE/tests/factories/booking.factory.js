import { randomUUID } from "node:crypto";
import { prisma } from "../../src/shared/database/client.js";
import { seedUser } from "./user.factory.js";
import { seedWorkspace } from "./workspace.factory.js";

let counter = 0;

function toTimeOfDay(hhmm) {
  return new Date(`1970-01-01T${hhmm}:00.000Z`);
}

function diffHours(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Builds a valid booking payload — satisfies every CHECK constraint by
 * default (30+ minute duration, totalAmount = subtotal + tax, etc.).
 * @param {{ bookingDate?: string, startTime?: string, endTime?: string, unitPrice?: number, taxPercent?: number }} [overrides]
 */
export function buildBooking(overrides = {}) {
  counter += 1;
  const {
    bookingDate = "2026-09-15",
    startTime = "09:00",
    endTime = "12:00",
    unitPrice = 50000,
    taxPercent = 11,
    ...rest
  } = overrides;

  const durationHours = diffHours(startTime, endTime);
  const subtotalAmount = round2(unitPrice * durationHours);
  const taxAmount = round2(subtotalAmount * (taxPercent / 100));
  const totalAmount = round2(subtotalAmount + taxAmount);
  const suffix = `${counter}${randomUUID().slice(0, 4).toUpperCase()}`;

  return {
    bookingDate: new Date(`${bookingDate}T00:00:00.000Z`),
    startTime: toTimeOfDay(startTime),
    endTime: toTimeOfDay(endTime),
    unitPrice,
    durationHours,
    subtotalAmount,
    taxAmount,
    totalAmount,
    currency: "IDR",
    reference: `TS-TEST${suffix}`,
    accessCode: `TS-TEST${suffix}-${randomUUID().slice(0, 6).toUpperCase()}`,
    ...rest,
  };
}

/** Persists, creating a user + workspace when not supplied. */
export async function seedBooking(overrides = {}) {
  const { userId, workspaceId, ...rest } = overrides;
  const resolvedUserId = userId ?? (await seedUser()).id;
  const resolvedWorkspaceId = workspaceId ?? (await seedWorkspace()).id;
  return prisma.booking.create({
    data: {
      ...buildBooking(rest),
      userId: resolvedUserId,
      workspaceId: resolvedWorkspaceId,
    },
  });
}

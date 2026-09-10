import { describe, it, expect } from "vitest";
import {
  computeDurationHours,
  computeBookingAmounts,
} from "../../../../src/features/bookings/pricing/pricing.js";

describe("computeDurationHours", () => {
  it("computes hours from HH:mm strings", () => {
    expect(computeDurationHours("09:00", "12:00")).toBe(3);
    expect(computeDurationHours("09:00", "09:30")).toBe(0.5);
  });
});

describe("computeBookingAmounts", () => {
  it("matches bookings.md §1's worked example exactly", () => {
    const amounts = computeBookingAmounts({
      startTime: "09:00",
      endTime: "12:00",
      unitPrice: "50000.00",
      taxPercent: "11.00",
    });

    expect(amounts).toEqual({
      durationHours: 3,
      subtotalAmount: 150000,
      taxAmount: 16500,
      totalAmount: 166500,
    });
  });

  it("accepts a Prisma Decimal-like value (has toString/valueOf, not a plain number)", () => {
    const decimalLike = { toString: () => "75000", valueOf: () => 75000 };
    const amounts = computeBookingAmounts({
      startTime: "10:00",
      endTime: "10:30",
      unitPrice: decimalLike,
      taxPercent: 0,
    });
    expect(amounts.subtotalAmount).toBe(37500);
  });

  it("rounds to 2 decimal places, never drifting from floating point", () => {
    const amounts = computeBookingAmounts({
      startTime: "09:00",
      endTime: "09:40",
      unitPrice: "33333.33",
      taxPercent: "11",
    });
    // 33333.33 * (40/60) = 22222.22
    expect(amounts.subtotalAmount).toBe(22222.22);
    expect(amounts.totalAmount).toBe(amounts.subtotalAmount + amounts.taxAmount);
  });
});

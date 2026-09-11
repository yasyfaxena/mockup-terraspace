import { describe, expect, it } from "vitest";
import {
  computeDurationHours,
  useBookingPrice,
} from "@/features/bookings/pricing/use-booking-price";

describe("computeDurationHours", () => {
  it("computes whole and fractional hours", () => {
    expect(computeDurationHours("09:00", "11:00")).toBe(2);
    expect(computeDurationHours("09:00", "09:30")).toBe(0.5);
  });
});

describe("useBookingPrice", () => {
  it("matches BE pricing.js's computeBookingAmounts for a real example", () => {
    // Real Phase 5 verification run: unitPrice 12000, 2 hours, 11% tax ->
    // subtotal 24000.00, tax 2640.00, total 26640.00 (confirmed against a
    // real BE-created booking, not just this formula).
    const price = useBookingPrice({
      startTime: "14:00",
      endTime: "16:00",
      unitPrice: "12000.00",
      taxPercent: "11.00",
    });

    expect(price).toEqual({
      durationHours: 2,
      subtotalAmount: 24000,
      taxAmount: 2640,
      totalAmount: 26640,
    });
  });

  it("rounds to 2 decimal places like BE's round2", () => {
    const price = useBookingPrice({
      startTime: "09:00",
      endTime: "09:45",
      unitPrice: "10000.00",
      taxPercent: "11.00",
    });

    // 10000 * 0.75 = 7500, tax = 7500 * 0.11 = 825, total = 8325
    expect(price.subtotalAmount).toBe(7500);
    expect(price.taxAmount).toBe(825);
    expect(price.totalAmount).toBe(8325);
  });
});

/**
 * Display-only mirror of BE `bookings/pricing/pricing.js`'s
 * `computeBookingAmounts` — shows a live total as the customer picks a
 * time. The server total, computed the same way from the same
 * `unitPrice`/`taxPercent`, is still the only one that's ever authoritative;
 * `bookings.schema.ts`'s `createBookingSchema` has no amount field for this
 * to feed into (development-phases.md Phase 5 exit criteria).
 */

const MINUTES_PER_HOUR = 60;
const CENTS_PRECISION = 100;
const PERCENT_DIVISOR = 100;

function round2(value: number): number {
  return Math.round(value * CENTS_PRECISION) / CENTS_PRECISION;
}

export function computeDurationHours(startTime: string, endTime: string): number {
  const [startHour = 0, startMinute = 0] = startTime.split(":").map(Number);
  const [endHour = 0, endMinute = 0] = endTime.split(":").map(Number);
  return (
    (endHour * MINUTES_PER_HOUR + endMinute - (startHour * MINUTES_PER_HOUR + startMinute)) /
    MINUTES_PER_HOUR
  );
}

export type BookingPriceBreakdown = {
  durationHours: number;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
};

export function useBookingPrice(params: {
  startTime: string;
  endTime: string;
  unitPrice: string | number;
  taxPercent: string | number;
}): BookingPriceBreakdown {
  const durationHours = computeDurationHours(params.startTime, params.endTime);
  const subtotalAmount = round2(Number(params.unitPrice) * durationHours);
  const taxAmount = round2(subtotalAmount * (Number(params.taxPercent) / PERCENT_DIVISOR));
  const totalAmount = round2(subtotalAmount + taxAmount);
  return { durationHours, subtotalAmount, taxAmount, totalAmount };
}

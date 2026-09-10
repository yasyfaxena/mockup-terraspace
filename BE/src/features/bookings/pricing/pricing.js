const MINUTES_PER_HOUR = 60;
const CENTS_PRECISION = 100;
const PERCENT_DIVISOR = 100;

/**
 * `startTime`/`endTime` are `HH:mm` strings, zero-padded, so lexicographic
 * and numeric ordering agree — no `Date` parsing needed here.
 * @param {string} startTime
 * @param {string} endTime
 * @returns {number}
 */
export function computeDurationHours(startTime, endTime) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  return (
    (endHour * MINUTES_PER_HOUR + endMinute - (startHour * MINUTES_PER_HOUR + startMinute)) /
    MINUTES_PER_HOUR
  );
}

/**
 * @param {number} value
 * @returns {number}
 */
function round2(value) {
  return Math.round(value * CENTS_PRECISION) / CENTS_PRECISION;
}

/**
 * The full price breakdown for a booking — bookings.md §1's "Price
 * calculation". `unitPrice` is a snapshot of `workspaces.pricePerHour` at
 * booking time; later catalog changes never alter it.
 * @param {{ startTime: string, endTime: string, unitPrice: unknown, taxPercent: unknown }} params
 * @returns {{ durationHours: number, subtotalAmount: number, taxAmount: number, totalAmount: number }}
 */
export function computeBookingAmounts({ startTime, endTime, unitPrice, taxPercent }) {
  const durationHours = computeDurationHours(startTime, endTime);
  const subtotalAmount = round2(Number(unitPrice) * durationHours);
  const taxAmount = round2(subtotalAmount * (Number(taxPercent) / PERCENT_DIVISOR));
  const totalAmount = round2(subtotalAmount + taxAmount);
  return { durationHours, subtotalAmount, taxAmount, totalAmount };
}

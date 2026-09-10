/**
 * `startTime`/`endTime` are `HH:mm` strings, zero-padded, so lexicographic
 * and numeric ordering agree — no `Date` parsing needed here.
 * @param {string} startTime
 * @param {string} endTime
 */
export function computeDurationHours(startTime, endTime) {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

/** @param {number} value */
function round2(value) {
  return Math.round(value * 100) / 100;
}

/**
 * The full price breakdown for a booking — bookings.md §1's "Price
 * calculation". `unitPrice` is a snapshot of `workspaces.pricePerHour` at
 * booking time; later catalog changes never alter it.
 * @param {{ startTime: string, endTime: string, unitPrice: unknown, taxPercent: unknown }} params
 */
export function computeBookingAmounts({ startTime, endTime, unitPrice, taxPercent }) {
  const durationHours = computeDurationHours(startTime, endTime);
  const subtotalAmount = round2(Number(unitPrice) * durationHours);
  const taxAmount = round2(subtotalAmount * (Number(taxPercent) / 100));
  const totalAmount = round2(subtotalAmount + taxAmount);
  return { durationHours, subtotalAmount, taxAmount, totalAmount };
}

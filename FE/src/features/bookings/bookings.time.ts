/**
 * Browser-local approximation of BE `bookings.time.js`'s
 * `bookingStartInstant` minus the cancellation window — see
 * `booking-card.tsx`'s comment for why this isn't venue-timezone-exact.
 */
export function estimateCancellationCutoff(
  bookingDate: string,
  startTime: string,
  cancellationWindowHours: number,
): Date {
  const start = new Date(`${bookingDate}T${startTime}:00`);
  return new Date(start.getTime() - cancellationWindowHours * 60 * 60 * 1000);
}

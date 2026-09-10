import { fromZonedTime } from "date-fns-tz";

/** @param {Date} time a `@db.Time` column value — a fixed epoch date carrying only the time */
function toHHMM(time) {
  return time.toISOString().slice(11, 16);
}

/**
 * Absolute instant a venue-local `YYYY-MM-DD` date + `HH:mm` clock time
 * represents, given the location's IANA timezone (libraries.md §11).
 * @param {string} dateStr `YYYY-MM-DD`
 * @param {string} hhmm
 * @param {string} timezone
 */
export function instantFromLocal(dateStr, hhmm, timezone) {
  return fromZonedTime(`${dateStr}T${hhmm}:00`, timezone);
}

/** @param {{ bookingDate: Date, startTime: Date }} booking @param {string} timezone */
export function bookingStartInstant(booking, timezone) {
  return instantFromLocal(
    booking.bookingDate.toISOString().slice(0, 10),
    toHHMM(booking.startTime),
    timezone,
  );
}

/** @param {{ bookingDate: Date, endTime: Date }} booking @param {string} timezone */
export function bookingEndInstant(booking, timezone) {
  return instantFromLocal(
    booking.bookingDate.toISOString().slice(0, 10),
    toHHMM(booking.endTime),
    timezone,
  );
}

/**
 * True once `now` is within `cancellationWindowHours` of the booking's
 * start — inclusive of the exact boundary, so cancelling exactly on it
 * still succeeds (bookings.md §4 exit criterion: enforced on both sides
 * of the boundary).
 * @param {{ bookingDate: Date, startTime: Date }} booking
 * @param {string} timezone
 * @param {number} cancellationWindowHours
 * @param {Date} [now]
 */
export function isCancellationWindowClosed(
  booking,
  timezone,
  cancellationWindowHours,
  now = new Date(),
) {
  const msUntilStart = bookingStartInstant(booking, timezone).getTime() - now.getTime();
  return msUntilStart < cancellationWindowHours * 60 * 60 * 1000;
}

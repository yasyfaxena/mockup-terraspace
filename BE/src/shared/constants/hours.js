/**
 * `locations.opening_hours` is free text for display ("Mon–Sun 09:00–22:00"),
 * not a machine-parseable schedule — the ERD has no structured open/close
 * columns (erd-spec.md §8). Availability computation needs *some* fixed
 * bound, so this is a documented platform-wide assumption, not a per-venue
 * setting, until the schema grows one.
 */
export const DEFAULT_OPENING_HOURS = Object.freeze({ from: "09:00", to: "22:00" });

/** `access_24_7` locations use this instead — `23:59`, not `24:00`, since
 * bookings never cross midnight (erd-spec.md §13's `start_time < end_time`). */
export const ALL_DAY_OPENING_HOURS = Object.freeze({ from: "00:00", to: "23:59" });

/** @param {{ access247: boolean }} location */
export function openingHoursFor(location) {
  return location.access247 ? ALL_DAY_OPENING_HOURS : DEFAULT_OPENING_HOURS;
}

/** Minimum booking duration — erd-spec.md §13's `end_time - start_time >= 30 minutes` CHECK. */
export const MINIMUM_BOOKING_MINUTES = 30;

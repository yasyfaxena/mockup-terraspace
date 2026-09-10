import { AvailabilityRepository } from "./availability.repository.js";

/** @param {Date} date a `@db.Time` column value — a fixed epoch date carrying only the time */
function toHHMM(date) {
  return date.toISOString().slice(11, 16);
}

/**
 * Free time is whatever is left of the opening hours once every busy
 * interval is subtracted. `busyIntervals` must already be sorted
 * ascending by `from` — the exclusion constraint guarantees they never
 * overlap for one workspace, so this is a single pass, no merging needed.
 * Bounds are half-open `[from, to)`, matching the exclusion constraint's
 * `'[)'` range (erd-spec.md §13) — a booking ending at 12:00 does not
 * block one starting at 12:00.
 * @param {import("./availability.types.js").TimeInterval} openingHours
 * @param {import("./availability.types.js").TimeInterval[]} busyIntervals
 * @returns {import("./availability.types.js").TimeInterval[]}
 */
export function computeFreeIntervals(openingHours, busyIntervals) {
  const free = [];
  let cursor = openingHours.from;
  for (const busy of busyIntervals) {
    if (busy.from > cursor) {
      free.push({ from: cursor, to: busy.from });
    }
    if (busy.to > cursor) {
      cursor = busy.to;
    }
  }
  if (cursor < openingHours.to) {
    free.push({ from: cursor, to: openingHours.to });
  }
  return free;
}

export class AvailabilityService {
  /** @param {{ availabilityRepository?: AvailabilityRepository }} [deps] */
  constructor(deps = {}) {
    this.repo = deps.availabilityRepository ?? new AvailabilityRepository();
  }

  /**
   * @param {string} workspaceId
   * @param {Date} bookingDate
   * @param {import("./availability.types.js").TimeInterval} openingHours
   */
  async getFreeBusy(workspaceId, bookingDate, openingHours) {
    const bookings = await this.repo.findBlockingBookings(workspaceId, bookingDate);
    const busy = bookings.map((booking) => ({
      from: toHHMM(booking.startTime),
      to: toHHMM(booking.endTime),
    }));
    return { busy, available: computeFreeIntervals(openingHours, busy) };
  }
}

export const availabilityService = new AvailabilityService();

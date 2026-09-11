import { bookingsService as defaultBookingsService } from "../features/bookings/index.js";
import { logger as defaultLogger } from "../shared/lib/logger.js";

/**
 * Promotes `confirmed` bookings whose local end time has passed to
 * `completed` (Phase 8).
 * @param {{ bookingsService?: typeof defaultBookingsService, logger?: typeof defaultLogger }} [deps]
 * @returns {Promise<void>}
 */
export async function runCompleteBookings(deps = {}) {
  const bookings = deps.bookingsService ?? defaultBookingsService;
  const log = deps.logger ?? defaultLogger;

  const { completed } = await bookings.completeElapsed();
  if (completed > 0) {
    log.info({ completed }, "Marked elapsed bookings completed");
  }
}

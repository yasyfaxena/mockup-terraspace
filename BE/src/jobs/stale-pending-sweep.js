import { paymentsService as defaultPaymentsService } from "../features/payments/index.js";
import { logger as defaultLogger } from "../shared/lib/logger.js";

const STALE_PENDING_MINUTES = 30;

/**
 * Cancels bookings still `pending` with no `paid` payment after 30
 * minutes — the backstop for a `payment_expired` webhook that never
 * arrives (payments.md §12). Without this, one abandoned checkout blocks
 * a room indefinitely.
 * @param {{ paymentsService?: typeof defaultPaymentsService, logger?: typeof defaultLogger }} [deps]
 * @returns {Promise<void>}
 */
export async function runStalePendingSweep(deps = {}) {
  const payments = deps.paymentsService ?? defaultPaymentsService;
  const log = deps.logger ?? defaultLogger;

  const { swept } = await payments.sweepStalePending(STALE_PENDING_MINUTES);
  if (swept > 0) {
    log.info({ swept }, "Stale-pending sweep cancelled abandoned checkouts");
  }
}

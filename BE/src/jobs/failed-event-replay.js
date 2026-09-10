import { paymentsService as defaultPaymentsService } from "../features/payments/index.js";
import { logger as defaultLogger } from "../shared/lib/logger.js";

const REPLAY_AFTER_MINUTES = 5;

/**
 * Reprocesses `payment_events` rows stuck `received`/`failed` for 5+
 * minutes — safe because processing is idempotent (payments.md §12).
 * @param {{ paymentsService?: typeof defaultPaymentsService, logger?: typeof defaultLogger }} [deps]
 * @returns {Promise<void>}
 */
export async function runFailedEventReplay(deps = {}) {
  const payments = deps.paymentsService ?? defaultPaymentsService;
  const log = deps.logger ?? defaultLogger;

  const { replayed } = await payments.replayFailedEvents(REPLAY_AFTER_MINUTES);
  if (replayed > 0) {
    log.info({ replayed }, "Failed-event replay reprocessed stuck webhook events");
  }
}

import { paymentsService as defaultPaymentsService } from "../features/payments/index.js";
import { logger as defaultLogger } from "../shared/lib/logger.js";

const RECONCILE_AFTER_MINUTES = 60;

/**
 * Compares `payments` still `pending`/`awaiting_payment` for an hour+
 * against PayBridge's own record and corrects drift — the safety net for
 * a webhook lost during an outage on our side. Webhooks dead-letter
 * after 3 attempts; without polling, that outage window loses the event
 * permanently (payments.md §12).
 * @param {{ paymentsService?: typeof defaultPaymentsService, logger?: typeof defaultLogger }} [deps]
 * @returns {Promise<void>}
 */
export async function runReconciliation(deps = {}) {
  const payments = deps.paymentsService ?? defaultPaymentsService;
  const log = deps.logger ?? defaultLogger;

  const { checked, corrected } = await payments.reconcile(RECONCILE_AFTER_MINUTES);
  if (corrected > 0) {
    log.warn({ checked, corrected }, "Reconciliation corrected drifted payment state");
  }
}

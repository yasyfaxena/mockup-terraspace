import cron from "node-cron";
import { logger } from "../shared/lib/logger.js";
import { runStalePendingSweep } from "./stale-pending-sweep.js";
import { runFailedEventReplay } from "./failed-event-replay.js";
import { runReconciliation } from "./reconciliation.js";

const EVERY_FIVE_MINUTES = "*/5 * * * *";
const DAILY_AT_2AM = "0 2 * * *";

/**
 * @param {string} name
 * @param {() => Promise<void>} run
 * @returns {() => Promise<void>}
 */
function guarded(name, run) {
  return async () => {
    try {
      await run();
    } catch (err) {
      logger.error({ err, job: name }, "Scheduled job failed");
    }
  };
}

/**
 * Registers the payments background jobs (payments.md §12). In-process
 * `node-cron`, per libraries.md §10 — no extra infrastructure, and jobs
 * run the same service code an HTTP request would.
 * @returns {void}
 */
export function startJobs() {
  cron.schedule(EVERY_FIVE_MINUTES, guarded("stale-pending-sweep", runStalePendingSweep));
  cron.schedule(EVERY_FIVE_MINUTES, guarded("failed-event-replay", runFailedEventReplay));
  cron.schedule(DAILY_AT_2AM, guarded("reconciliation", runReconciliation));
}

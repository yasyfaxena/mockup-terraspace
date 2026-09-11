import * as Sentry from "@sentry/node";
import { env } from "../config/env.js";

/**
 * A no-op when `SENTRY_DSN` is unset (every dev/test box) — `Sentry.init`
 * without a `dsn` disables sending, it does not throw, so this is safe to
 * call unconditionally at boot.
 * @returns {void}
 */
export function initSentry() {
  if (!env.SENTRY_DSN) return;
  Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV });
}

/**
 * A plain object wrapping the SDK's `captureException`, not a re-export
 * of Sentry's own module namespace — `vi.spyOn` cannot redefine a
 * property on a live ESM namespace object, only on a regular object
 * like this one (error-handler.test.js's Sentry-wiring tests).
 */
export const sentryClient = {
  /**
   * @param {unknown} err
   * @returns {string}
   */
  captureException: (err) => Sentry.captureException(err),
};

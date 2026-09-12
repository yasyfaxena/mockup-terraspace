import { rateLimit } from "express-rate-limit";
import { RateLimitError } from "../errors/http-errors.js";
import { env } from "../config/env.js";

const MS_PER_MINUTE = 60_000;

const AUTH_WINDOW_MINUTES = 15;
const AUTH_MAX_REQUESTS = 30;

/**
 * Credential-guessing and reset-spam surfaces only. `get-session`,
 * `sign-out`, `callback/*` etc. are read/no-op traffic that Better Auth's
 * client calls on nearly every page load — sharing the same tight budget
 * with those starved real sign-ins out under completely normal browsing.
 */
const AUTH_SENSITIVE_PATH = /^\/api\/auth\/(sign-in|sign-up|forget-password|reset-password)/;

/**
 * `authRateLimit` is mounted with `app.use("/api/auth", ...)`, so inside it
 * `req.path` is already relative to that prefix — only `req.originalUrl`
 * still has the full, unstripped path the regex above expects.
 * @param {import("express").Request} req
 * @returns {boolean}
 */
function isSensitiveAuthPath(req) {
  return AUTH_SENSITIVE_PATH.test(req.originalUrl);
}

const API_WINDOW_MINUTES = 15;
const API_MAX_REQUESTS = 300;

/**
 * Funnels a throttled request into the normal error envelope instead of
 * express-rate-limit's own plain response, so a `429` looks like every
 * other error this API returns. Exported for its own unit test — the
 * exported limiters themselves are inert under `NODE_ENV=test` (see
 * `skipInTest`), so this is the only way to exercise the 429 path at all.
 * @type {import("express-rate-limit").RateLimitExceededEventHandler}
 */
export function toErrorEnvelope(_req, _res, next) {
  next(new RateLimitError("Too many requests. Try again later."));
}

/**
 * The integration suite signs in dozens of times per file via
 * `createUserAndSignIn` — a real budget would turn most of it into 429s
 * that have nothing to do with what each test is checking. Disabled only
 * in `test`, never in `development`/`production` (testing.md's own
 * "never optimize a test harness into disagreeing with production
 * behaviour" principle still holds for the *endpoints under test*; this
 * skip is scoped to a cross-cutting concern the tests aren't about).
 * @returns {boolean}
 */
function skipInTest() {
  return env.NODE_ENV === "test";
}

/**
 * Sign-in, sign-up and forget/reset-password share one tight budget per
 * IP — every other `/api/auth/*` route (`get-session`, `sign-out`,
 * `callback/*`, …) is skipped. This is what makes credential stuffing
 * and password-reset-email spam expensive rather than free
 * (development-phases.md Phase 8, auth.md's forget-password note).
 */
export const authRateLimit = rateLimit({
  windowMs: AUTH_WINDOW_MINUTES * MS_PER_MINUTE,
  limit: AUTH_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: toErrorEnvelope,
  skip: (req) => skipInTest() || !isSensitiveAuthPath(req),
});

/** A looser, general budget for the rest of `/api/v1` — defense in depth, not the primary control. */
export const apiRateLimit = rateLimit({
  windowMs: API_WINDOW_MINUTES * MS_PER_MINUTE,
  limit: API_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: toErrorEnvelope,
  skip: skipInTest,
});

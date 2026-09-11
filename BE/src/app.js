import express from "express";
import helmet from "helmet";
import cors from "cors";
import { pinoHttp } from "pino-http";
import { env } from "./shared/config/env.js";
import { logger } from "./shared/lib/logger.js";
import { requestContext } from "./shared/middleware/request-context.js";
import { notFoundHandler } from "./shared/middleware/not-found.js";
import { errorHandler } from "./shared/middleware/error-handler.js";
import { apiRouter } from "./shared/router.js";
import { healthRouter } from "./shared/routes/health.route.js";
import { mountAuthHandler } from "./features/auth/index.js";
import { mountPaymentsWebhook } from "./features/payments/index.js";
import { authRateLimit, apiRateLimit } from "./shared/middleware/rate-limit.js";
import { initSentry } from "./shared/lib/sentry.js";
import { openApiRouter } from "./openapi/openapi.route.js";

initSentry();

const app = express();

// ── API docs — BEFORE helmet(), which would otherwise block Scalar's
// own inline scripts via CSP; this is a read-only informational page,
// not a surface that needs the same hardening as the JSON API ────────
app.use(openApiRouter);

// ── Security ────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.TRUSTED_ORIGINS,
    credentials: true,
  }),
);

// ── Request context (ID + child logger) ─────────────────────
app.use(requestContext(logger));
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.id,
  }),
);

// ── Better Auth — BEFORE express.json() (libraries.md §2) ───
// Rate limit ahead of the handler itself — credential stuffing and
// password-reset-email spam must be expensive before Better Auth even
// looks at the request (development-phases.md Phase 8).
app.use("/api/auth", authRateLimit);
mountAuthHandler(app);

// ── PayBridge webhook — BEFORE express.json(), raw body only ─
// (payments.md §7 — the second place middleware order is load-bearing)
mountPaymentsWebhook(app);

// ── Body parsing ────────────────────────────────────────────
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────
app.use(healthRouter); // GET /health — outside /api/v1, no auth
app.use("/api/v1", apiRateLimit, apiRouter);

// ── Fallbacks — order matters ───────────────────────────────
app.use(notFoundHandler); // 404 — must come after routes
app.use(errorHandler); // ← always last

export { app };

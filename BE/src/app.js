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

const app = express();

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
mountAuthHandler(app);

// ── Body parsing ────────────────────────────────────────────
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────
app.use(healthRouter); // GET /health — outside /api/v1, no auth
app.use("/api/v1", apiRouter);

// ── Fallbacks — order matters ───────────────────────────────
app.use(notFoundHandler); // 404 — must come after routes
app.use(errorHandler); // ← always last

export { app };

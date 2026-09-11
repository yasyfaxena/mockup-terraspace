import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import { rateLimit } from "express-rate-limit";
import {
  toErrorEnvelope,
  authRateLimit,
  apiRateLimit,
} from "../../../../src/shared/middleware/rate-limit.js";
import { errorHandler } from "../../../../src/shared/middleware/error-handler.js";

const ONE_MINUTE = 60_000;

/** A limiter with the real handler but `skip` disabled, so it actually throttles under NODE_ENV=test. */
function probeLimiter(limit) {
  return rateLimit({
    windowMs: ONE_MINUTE,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: toErrorEnvelope,
  });
}

function buildProbeApp(limit) {
  const app = express();
  app.use((req, _res, next) => {
    req.id = "probe-rate-limit";
    next();
  });
  app.use(probeLimiter(limit));
  app.get("/boom", (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

describe("rate-limit middleware (development-phases.md Phase 8)", () => {
  it("allows requests under the budget", async () => {
    const app = buildProbeApp(2);
    const res = await request(app).get("/boom");
    expect(res.status).toBe(200);
  });

  it("responds 429 with the normal error envelope once the budget is exhausted", async () => {
    const app = buildProbeApp(1);
    await request(app).get("/boom");
    const res = await request(app).get("/boom");

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("RATE_LIMITED");
    expect(res.body.error.requestId).toBe("probe-rate-limit");
  });

  it("exports authRateLimit and apiRateLimit as configured middleware", () => {
    expect(typeof authRateLimit).toBe("function");
    expect(typeof apiRateLimit).toBe("function");
  });
});

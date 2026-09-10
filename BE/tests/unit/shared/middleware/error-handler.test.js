import { describe, it, expect } from "vitest";
import request from "supertest";
import { Router } from "express";
import express from "express";
import { app } from "../../../../src/app.js";
import { apiRouter } from "../../../../src/shared/router.js";
import { errorHandler } from "../../../../src/shared/middleware/error-handler.js";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "../../../../src/shared/errors/index.js";

describe("error envelope (§3)", () => {
  it("an unmatched route falls through to the 404 handler with the envelope shape", async () => {
    const res = await request(app).get("/api/v1/this-route-does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({
      code: "NOT_FOUND",
    });
    expect(res.body.error.requestId).toBeTruthy();
    expect(typeof res.body.error.requestId).toBe("string");
  });

  it("propagates the same requestId given on the incoming request", async () => {
    const res = await request(app)
      .get("/api/v1/this-route-does-not-exist")
      .set("x-request-id", "test-fixed-id-123");

    expect(res.status).toBe(404);
    expect(res.body.error.requestId).toBe("test-fixed-id-123");
  });

  it("a deliberately thrown NotFoundError inside a route produces the same envelope", async () => {
    // Minimal app wired the same way as the real one, but with a route that
    // deliberately throws — proves the envelope for domain errors thrown by
    // application code, not just the router's own 404 fallback.
    const probe = express();
    probe.use((req, _res, next) => {
      req.id = "probe-request-id";
      next();
    });
    probe.get("/boom", (_req, _res, next) => {
      next(new NotFoundError("Widget not found."));
    });
    probe.use(errorHandler);

    const res = await request(probe).get("/boom");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Widget not found.",
        requestId: "probe-request-id",
        details: null,
      },
    });
  });

  it("a ValidationError includes field-level details in the envelope", async () => {
    const probe = express();
    probe.use((req, _res, next) => {
      req.id = "probe-2";
      next();
    });
    probe.get("/boom", (_req, _res, next) => {
      next(
        new ValidationError("Request validation failed.", {
          details: [{ path: "email", message: "Required" }],
        }),
      );
    });
    probe.use(errorHandler);

    const res = await request(probe).get("/boom");

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
    expect(res.body.error.details).toEqual([{ path: "email", message: "Required" }]);
  });

  it("a non-operational error hides its message from the response", async () => {
    const probe = express();
    probe.use((req, _res, next) => {
      req.id = "probe-3";
      next();
    });
    probe.get("/boom", () => {
      throw new Error("leaked internal detail");
    });
    probe.use(errorHandler);

    const res = await request(probe).get("/boom");

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
    expect(res.body.error.message).toBe("Something went wrong.");
  });

  it("registers apiRouter under /api/v1 without throwing on mount", () => {
    expect(() => new Router().use("/api/v1", apiRouter)).not.toThrow();
  });

  it("smoke-checks ForbiddenError maps to 403", async () => {
    const probe = express();
    probe.use((req, _res, next) => {
      req.id = "probe-4";
      next();
    });
    probe.get("/boom", (_req, _res, next) => next(new ForbiddenError("Nope.")));
    probe.use(errorHandler);

    const res = await request(probe).get("/boom");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});

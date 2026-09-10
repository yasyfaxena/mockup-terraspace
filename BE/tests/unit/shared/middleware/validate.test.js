import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { validate } from "../../../../src/shared/middleware/validate.js";

/**
 * Express 5's `req.query` is a getter with no setter — mimic that here so
 * this test actually exercises the failure mode a plain `{ query: {} }`
 * mock would silently paper over.
 */
function makeReqWithGetterOnlyQuery(query) {
  const req = { params: {}, body: {} };
  Object.defineProperty(req, "query", { get: () => query, enumerable: true });
  return req;
}

describe("validate", () => {
  it("reassigns req.params and req.body in place", () => {
    const schemas = {
      params: z.object({ id: z.string() }),
      body: z.object({ name: z.string() }),
    };
    const req = { params: { id: "abc" }, body: { name: "Ana" }, query: {} };
    const next = vi.fn();

    validate(schemas)(req, /** @type {any} */ ({}), next);

    expect(req.params).toEqual({ id: "abc" });
    expect(req.body).toEqual({ name: "Ana" });
    expect(next).toHaveBeenCalledWith();
  });

  it("stores a validated query on req.validatedQuery, never reassigning req.query", () => {
    const schemas = { query: z.object({ page: z.coerce.number().default(1) }) };
    const req = makeReqWithGetterOnlyQuery({});
    const next = vi.fn();

    expect(() => validate(schemas)(req, /** @type {any} */ ({}), next)).not.toThrow();
    expect(/** @type {any} */ (req).validatedQuery).toEqual({ page: 1 });
    expect(next).toHaveBeenCalledWith();
  });

  it("throws synchronously on invalid input, for Express to catch", () => {
    const schemas = { body: z.object({ name: z.string() }) };
    const req = { body: {}, query: {} };

    expect(() => validate(schemas)(req, /** @type {any} */ ({}), vi.fn())).toThrow();
  });
});

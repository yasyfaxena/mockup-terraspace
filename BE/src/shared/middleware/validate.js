/**
 * Creates a Zod validation middleware.
 * Validates body, query, and/or params against the provided schemas.
 *
 * Express 5's `req.query` is a getter that re-parses `req.url` on every
 * access — it has no setter, and any assignment (`req.query = x`) throws
 * "Cannot set property query". The validated/defaulted query therefore
 * lands on `req.validatedQuery` instead; read that in the controller, not
 * `req.query`, when a route validates its query.
 *
 * @param {{ body?: import("zod").ZodType, query?: import("zod").ZodType, params?: import("zod").ZodType }} schemas
 * @returns {import("express").RequestHandler}
 */
export function validate(schemas) {
  return (req, _res, next) => {
    if (schemas.params) {
      req.params = schemas.params.parse(req.params);
    }
    if (schemas.query) {
      /** @type {any} */ (req).validatedQuery = schemas.query.parse(req.query);
    }
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    next();
  };
}

import crypto from "node:crypto";

/**
 * Assigns a unique request ID and binds a child logger to each request.
 * @param {import("pino").Logger} logger
 * @returns {import("express").RequestHandler}
 */
export function requestContext(logger) {
  return (req, _res, next) => {
    req.id = req.headers["x-request-id"] ?? crypto.randomUUID();
    req.log = logger.child({ requestId: req.id });
    next();
  };
}

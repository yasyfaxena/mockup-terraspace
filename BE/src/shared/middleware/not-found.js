import { NotFoundError } from "../errors/http-errors.js";

/**
 * 404 fallback — routes unmatched requests through the error pipeline.
 * @type {import("express").RequestHandler}
 */
export const notFoundHandler = (req, _res, next) => {
  return next(new NotFoundError(`Route ${req.method} ${req.path} does not exist.`));
};

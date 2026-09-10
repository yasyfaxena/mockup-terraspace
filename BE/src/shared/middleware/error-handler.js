import { AppError } from "../errors/app-error.js";
import { InternalError, ValidationError } from "../errors/http-errors.js";
import { mapPrismaError } from "../errors/prisma-mapper.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

/**
 * Converts a ZodError into a ValidationError with per-field detail.
 * @param {import("zod").ZodError} err
 * @returns {ValidationError}
 */
function toValidationError(err) {
  return new ValidationError("Request validation failed.", {
    details: err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
}

/**
 * @param {unknown} err
 * @returns {AppError}
 */
function mapError(err) {
  if (err instanceof AppError) return err;
  if (err?.constructor?.name === "ZodError") {
    return toValidationError(/** @type {import("zod").ZodError} */ (err));
  }
  return mapPrismaError(err) ?? new InternalError("Unexpected error.", { cause: err });
}

/**
 * @param {import("pino").Logger} log
 * @param {AppError} mapped
 * @param {unknown} err
 * @returns {void}
 */
function logMappedError(log, mapped, err) {
  if (mapped.isOperational) {
    log.warn({ code: mapped.code, status: mapped.status }, mapped.message);
  } else {
    log.error({ err, code: mapped.code }, "Unhandled error");
  }
}

/**
 * @param {AppError} mapped
 * @param {unknown} err
 * @param {import("pino-http").ReqId} requestId
 * @returns {object}
 */
function buildErrorBody(mapped, err, requestId) {
  const includeStack = env.NODE_ENV !== "production" && !mapped.isOperational;
  return {
    error: {
      code: mapped.code,
      message: mapped.isOperational ? mapped.message : "Something went wrong.",
      requestId,
      details: mapped.details ?? null,
      ...(includeStack ? { stack: err instanceof Error ? err.stack : undefined } : {}),
    },
  };
}

/**
 * Central error handler middleware — always registered last.
 * @type {import("express").ErrorRequestHandler}
 */
export const errorHandler = (err, req, res, _next) => {
  // Express has already started writing — let it abort the connection
  if (res.headersSent) return _next(err);

  const mapped = mapError(err);
  logMappedError(req.log ?? logger, mapped, err);

  return res.status(mapped.status).json(buildErrorBody(mapped, err, req.id));
};

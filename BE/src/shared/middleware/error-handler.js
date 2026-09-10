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
    details: err.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    })),
  });
}

/**
 * Central error handler middleware — always registered last.
 * @type {import("express").ErrorRequestHandler}
 */
export const errorHandler = (err, req, res, _next) => {
  // Express has already started writing — let it abort the connection
  if (res.headersSent) return _next(err);

  /** @type {AppError} */
  let mapped;
  if (err instanceof AppError) {
    mapped = err;
  } else if (err?.constructor?.name === "ZodError") {
    mapped = toValidationError(err);
  } else {
    mapped = mapPrismaError(err) ?? new InternalError("Unexpected error.", { cause: err });
  }

  const log = req.log ?? logger;
  if (mapped.isOperational) {
    log.warn({ code: mapped.code, status: mapped.status }, mapped.message);
  } else {
    log.error({ err, code: mapped.code }, "Unhandled error");
  }

  res.status(mapped.status).json({
    error: {
      code: mapped.code,
      message: mapped.isOperational ? mapped.message : "Something went wrong.",
      requestId: req.id,
      details: mapped.details ?? null,
      ...(env.NODE_ENV !== "production" && !mapped.isOperational
        ? { stack: err instanceof Error ? err.stack : undefined }
        : {}),
    },
  });
};

import { ConflictError, InternalError, NotFoundError, ValidationError } from "./http-errors.js";

/**
 * Maps a Prisma error to an AppError.
 * @param {unknown} err
 * @returns {import("./app-error.js").AppError | null} null when unrecognized — the handler wraps it
 */
export function mapPrismaError(err) {
  // Guard: only map errors that look like Prisma known-request errors
  if (err && typeof err === "object" && "code" in err && "clientVersion" in err) {
    switch (err.code) {
      case "P2002":
        return new ConflictError("A record with these values already exists.");
      case "P2025":
        return new NotFoundError("Resource not found.");
      case "P2003":
        return new ConflictError("Related record is missing or still in use.");
      case "P2000":
        return new ValidationError("A value is too long for its field.");
    }
  }

  // Prisma validation errors (bad query shape — always a bug)
  if (err && typeof err === "object" && err.constructor?.name === "PrismaClientValidationError") {
    return new InternalError("Invalid database query.", { cause: err });
  }

  return null; // unrecognized → InternalError in the handler
}

/**
 * Checks whether an error is a PostgreSQL exclusion-constraint violation (SQLSTATE 23P01).
 * Used by the bookings service to translate into SlotTakenError.
 * @param {unknown} err
 * @returns {boolean}
 */
export function isExclusionViolation(err) {
  if (!err || typeof err !== "object") return false;
  const e = /** @type {{ code?: unknown, meta?: { code?: unknown } }} */ (err);
  // Prisma wraps raw PG errors as P2010 with meta.code
  if (e.code === "P2010" && e.meta?.code === "23P01") return true;
  // Direct PG error from $queryRaw
  if (e.code === "23P01") return true;
  return false;
}

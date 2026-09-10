import { ConflictError, InternalError, NotFoundError, ValidationError } from "./http-errors.js";

/**
 * Extracts a raw PostgreSQL SQLSTATE from a Prisma error, however Prisma
 * chose to surface it. A `PrismaClientKnownRequestError` carries it as
 * `meta.code` (e.g. a raw query's P2010). A `PrismaClientUnknownRequestError`
 * — what a structured call like `.create()` throws for a constraint Prisma
 * has no dedicated mapping for, such as our hand-written CHECKs and the
 * `bookings_no_overlap` EXCLUDE constraint — has no `.code`/`.meta` at all;
 * the SQLSTATE only appears embedded in its formatted `.message`.
 * @param {unknown} err
 * @returns {string | null}
 */
function extractSqlState(err) {
  if (!err || typeof err !== "object") return null;
  const e = /** @type {{ meta?: { code?: unknown }, message?: unknown }} */ (err);
  if (typeof e.meta?.code === "string") return e.meta.code;
  if (typeof e.message === "string") {
    const match = e.message.match(/code:\s*"([0-9A-Z]{5})"/);
    if (match) return match[1];
  }
  return null;
}

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

  // Raw PostgreSQL codes for constraints Prisma has no dedicated mapping
  // for — e.g. the hand-written `payments_one_paid_per_booking` partial
  // unique index (error-handling.md §8).
  switch (extractSqlState(err)) {
    case "23505":
    case "23503":
      return new ConflictError("A record with these values already exists.");
    case "23514":
      return new ValidationError("The request violates a data rule.");
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
  return extractSqlState(err) === "23P01";
}

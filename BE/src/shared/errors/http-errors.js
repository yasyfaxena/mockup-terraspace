import { AppError } from "./app-error.js";
import { ERROR_CODE } from "./error-codes.js";

// Every `code` field below is explicitly widened to `string` via `@type`.
// `ERROR_CODE.X` is a property access into a frozen object, so its type is
// a *non-fresh* literal — TypeScript does not widen those the way it
// widens a bare string literal, and an unannotated field here would lock
// every feature error (error-handling.md §6) that extends one of these
// into reusing this exact code, since a narrower override is rejected.

export class ValidationError extends AppError {
  status = 422;
  /** @type {string} */
  code = ERROR_CODE.VALIDATION_FAILED;
}

export class UnauthorizedError extends AppError {
  status = 401;
  /** @type {string} */
  code = ERROR_CODE.UNAUTHENTICATED;
}

export class ForbiddenError extends AppError {
  status = 403;
  /** @type {string} */
  code = ERROR_CODE.FORBIDDEN;
}

export class NotFoundError extends AppError {
  status = 404;
  /** @type {string} */
  code = ERROR_CODE.NOT_FOUND;
}

export class ConflictError extends AppError {
  status = 409;
  /** @type {string} */
  code = ERROR_CODE.CONFLICT;
}

export class RateLimitError extends AppError {
  status = 429;
  /** @type {string} */
  code = ERROR_CODE.RATE_LIMITED;
}

export class InternalError extends AppError {
  status = 500;
  /** @type {string} */
  code = ERROR_CODE.INTERNAL_ERROR;
  isOperational = false;
}

// External provider failures — ours to report, not ours to fix
export class ProviderError extends AppError {
  status = 502;
  /** @type {string} */
  code = ERROR_CODE.PROVIDER_ERROR;
}

export class ProviderTimeout extends AppError {
  status = 504;
  /** @type {string} */
  code = ERROR_CODE.PROVIDER_TIMEOUT;
}

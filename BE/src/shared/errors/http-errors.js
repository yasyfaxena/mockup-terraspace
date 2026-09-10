import { AppError } from "./app-error.js";
import { ERROR_CODE } from "./error-codes.js";
import { HTTP_STATUS } from "../constants/http-status.js";

// Every `code`/`status` field below is explicitly widened via `@type`.
// `ERROR_CODE.X`/`HTTP_STATUS.X` are property accesses into frozen objects,
// so their type is a *non-fresh* literal — TypeScript does not widen those
// the way it widens a bare literal, and an unannotated field here would
// lock every feature error (error-handling.md §6) that extends one of
// these into reusing this exact code/status, since a narrower override is
// rejected.

export class ValidationError extends AppError {
  /** @type {number} */
  status = HTTP_STATUS.VALIDATION_FAILED;
  /** @type {string} */
  code = ERROR_CODE.VALIDATION_FAILED;
}

export class UnauthorizedError extends AppError {
  /** @type {number} */
  status = HTTP_STATUS.UNAUTHENTICATED;
  /** @type {string} */
  code = ERROR_CODE.UNAUTHENTICATED;
}

export class ForbiddenError extends AppError {
  /** @type {number} */
  status = HTTP_STATUS.FORBIDDEN;
  /** @type {string} */
  code = ERROR_CODE.FORBIDDEN;
}

export class NotFoundError extends AppError {
  /** @type {number} */
  status = HTTP_STATUS.NOT_FOUND;
  /** @type {string} */
  code = ERROR_CODE.NOT_FOUND;
}

export class ConflictError extends AppError {
  /** @type {number} */
  status = HTTP_STATUS.CONFLICT;
  /** @type {string} */
  code = ERROR_CODE.CONFLICT;
}

export class RateLimitError extends AppError {
  /** @type {number} */
  status = HTTP_STATUS.RATE_LIMITED;
  /** @type {string} */
  code = ERROR_CODE.RATE_LIMITED;
}

export class InternalError extends AppError {
  /** @type {number} */
  status = HTTP_STATUS.INTERNAL_ERROR;
  /** @type {string} */
  code = ERROR_CODE.INTERNAL_ERROR;
  isOperational = false;
}

// External provider failures — ours to report, not ours to fix
export class ProviderError extends AppError {
  /** @type {number} */
  status = HTTP_STATUS.PROVIDER_ERROR;
  /** @type {string} */
  code = ERROR_CODE.PROVIDER_ERROR;
}

export class ProviderTimeout extends AppError {
  /** @type {number} */
  status = HTTP_STATUS.PROVIDER_TIMEOUT;
  /** @type {string} */
  code = ERROR_CODE.PROVIDER_TIMEOUT;
}

import { AppError } from "./app-error.js";
import { ERROR_CODE } from "./error-codes.js";

export class ValidationError extends AppError {
  status = 422;
  code = ERROR_CODE.VALIDATION_FAILED;
}

export class UnauthorizedError extends AppError {
  status = 401;
  code = ERROR_CODE.UNAUTHENTICATED;
}

export class ForbiddenError extends AppError {
  status = 403;
  code = ERROR_CODE.FORBIDDEN;
}

export class NotFoundError extends AppError {
  status = 404;
  code = ERROR_CODE.NOT_FOUND;
}

export class ConflictError extends AppError {
  status = 409;
  code = ERROR_CODE.CONFLICT;
}

export class RateLimitError extends AppError {
  status = 429;
  code = ERROR_CODE.RATE_LIMITED;
}

export class InternalError extends AppError {
  status = 500;
  code = ERROR_CODE.INTERNAL_ERROR;
  isOperational = false;
}

// External provider failures — ours to report, not ours to fix
export class ProviderError extends AppError {
  status = 502;
  code = ERROR_CODE.PROVIDER_ERROR;
}

export class ProviderTimeout extends AppError {
  status = 504;
  code = ERROR_CODE.PROVIDER_TIMEOUT;
}

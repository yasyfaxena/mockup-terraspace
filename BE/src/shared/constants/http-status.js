/**
 * The HTTP status codes this codebase actually uses — named once so no
 * status ever appears as a bare number (linter.md §5).
 */
export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  VALIDATION_FAILED: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  PROVIDER_ERROR: 502,
  SERVICE_UNAVAILABLE: 503,
  PROVIDER_TIMEOUT: 504,
});

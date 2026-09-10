export class AppError extends Error {
  /** HTTP status — set by each subclass as a class field. */
  status = 500;

  /** Machine-readable code from ERROR_CODE. */
  code = "INTERNAL_ERROR";

  /** true = expected business outcome; false = a bug. */
  isOperational = true;

  /**
   * @param {string} message
   * @param {{ details?: Array<{ path: string, message: string }>, cause?: unknown }} [options]
   */
  constructor(message, options = {}) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.details = options.details;
    Error.captureStackTrace(this, new.target);
  }
}

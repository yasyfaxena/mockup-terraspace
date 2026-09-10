import { HTTP_STATUS } from "../constants/http-status.js";

export class AppError extends Error {
  /**
   * HTTP status — set by each subclass as a class field. Widened to
   * `number`: `HTTP_STATUS.X` is a property access into a frozen object,
   * so its type is a *non-fresh* literal, and an unannotated field here
   * would lock every subclass into reusing this exact status.
   * @type {number}
   */
  status = HTTP_STATUS.INTERNAL_ERROR;

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

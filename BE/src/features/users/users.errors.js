import { ConflictError, ValidationError } from "../../shared/errors/http-errors.js";
import { ERROR_CODE } from "../../shared/errors/error-codes.js";

export class EmailAlreadyExistsError extends ConflictError {
  code = ERROR_CODE.EMAIL_ALREADY_EXISTS;
  constructor() {
    super("A user with this email already exists.");
  }
}

export class LastAdminError extends ValidationError {
  /** @param {string} message */
  constructor(message) {
    super(message);
  }
}

export class UserHasBookingsError extends ConflictError {
  constructor() {
    super("This user has bookings and cannot be deleted. Ban the user instead.");
  }
}

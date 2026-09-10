import { ValidationError } from "../../shared/errors/http-errors.js";
import { ERROR_CODE } from "../../shared/errors/error-codes.js";

export class BookingInPastError extends ValidationError {
  code = ERROR_CODE.BOOKING_IN_PAST;
  constructor() {
    super("This date has already passed.");
  }
}

export class AdvanceBookingExceededError extends ValidationError {
  code = ERROR_CODE.BOOKING_TOO_FAR_AHEAD;
  /** @param {number} days */
  constructor(days) {
    super(`Bookings can only be made up to ${days} days in advance.`);
  }
}

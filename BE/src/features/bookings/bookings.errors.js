import { ValidationError, ConflictError, ForbiddenError } from "../../shared/errors/http-errors.js";
import { ERROR_CODE } from "../../shared/errors/error-codes.js";

export class BookingInPastError extends ValidationError {
  /** @type {string} */
  code = ERROR_CODE.BOOKING_IN_PAST;
  constructor() {
    super("This date has already passed.");
  }
}

export class AdvanceBookingExceededError extends ValidationError {
  /** @type {string} */
  code = ERROR_CODE.BOOKING_TOO_FAR_AHEAD;
  /** @param {number} days */
  constructor(days) {
    super(`Bookings can only be made up to ${days} days in advance.`);
  }
}

export class BookingMinDurationError extends ValidationError {
  /** @type {string} */
  code = ERROR_CODE.BOOKING_MIN_DURATION;
  constructor() {
    super("Bookings must be at least 30 minutes long.");
  }
}

export class SlotTakenError extends ConflictError {
  /** @type {string} */
  code = ERROR_CODE.BOOKING_SLOT_TAKEN;
  constructor() {
    super("This time slot was just booked.");
  }
}

export class WorkspaceNotBookableError extends ConflictError {
  /** @type {string} */
  code = ERROR_CODE.WORKSPACE_NOT_BOOKABLE;
  constructor() {
    super("This workspace is not currently bookable.");
  }
}

export class LocationInactiveError extends ConflictError {
  /** @type {string} */
  code = ERROR_CODE.LOCATION_INACTIVE;
  constructor() {
    super("This location is not currently active.");
  }
}

export class CancellationWindowClosedError extends ForbiddenError {
  /** @type {string} */
  code = ERROR_CODE.BOOKING_CANCELLATION_WINDOW_CLOSED;
  /** @param {number} hours */
  constructor(hours) {
    super(`Bookings can only be cancelled at least ${hours} hours in advance.`);
  }
}

export class BookingAlreadyCancelledError extends ConflictError {
  /** @type {string} */
  code = ERROR_CODE.BOOKING_ALREADY_CANCELLED;
  constructor() {
    super("This booking is already cancelled.");
  }
}

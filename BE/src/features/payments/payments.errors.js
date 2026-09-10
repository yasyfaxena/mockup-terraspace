import {
  ConflictError,
  ValidationError,
  ProviderError,
  ProviderTimeout,
} from "../../shared/errors/http-errors.js";
import { ERROR_CODE } from "../../shared/errors/error-codes.js";

export class PaymentAlreadyPaidError extends ConflictError {
  /** @type {string} */
  code = ERROR_CODE.PAYMENT_ALREADY_PAID;
  constructor() {
    super("This booking has already been paid.");
  }
}

export class PaymentAlreadyPendingError extends ConflictError {
  /** @type {string} */
  code = ERROR_CODE.PAYMENT_ALREADY_PENDING;
  constructor() {
    super("A checkout session is already in progress for this booking.");
  }
}

export class PaymentNotRefundableError extends ConflictError {
  /** @type {string} */
  code = ERROR_CODE.PAYMENT_NOT_REFUNDABLE;
  constructor() {
    super("Only a paid payment can be refunded.");
  }
}

export class PaymentCustomerIncompleteError extends ValidationError {
  /** @type {string} */
  code = ERROR_CODE.PAYMENT_CUSTOMER_INCOMPLETE;
  constructor() {
    super("Add a phone number to your profile before checking out.");
  }
}

export class RefundExceedsRemainderError extends ValidationError {
  /** @type {string} */
  code = ERROR_CODE.REFUND_EXCEEDS_REMAINDER;
  constructor() {
    super("Refund amount exceeds the unrefunded balance.");
  }
}

/** Thrown by the payments service, not the client — see error-handling.md §8's "who translates what". */
export class PaymentProviderError extends ProviderError {
  /** @type {string} */
  code = ERROR_CODE.PAYMENT_PROVIDER_ERROR;
}

export class PaymentProviderTimeout extends ProviderTimeout {
  /** @type {string} */
  code = ERROR_CODE.PAYMENT_PROVIDER_TIMEOUT;
}

import { Decimal } from "@prisma/client/runtime/library";
import { InternalError } from "../errors/http-errors.js";

/**
 * PayBridge takes `amount` as a positive integer in the smallest currency
 * unit. This platform is IDR-only in practice, but the table covers every
 * currency `adminSettings.currency` could admin-editably be set to
 * (payments.md §3).
 * @type {Record<string, number>}
 */
export const CURRENCY_EXPONENT = Object.freeze({
  IDR: 0,
  JPY: 0,
  USD: 2,
  SGD: 2,
  MYR: 2,
  EUR: 2,
});

const DECIMAL_RADIX = 10;
const MONEY_DISPLAY_DECIMALS = 2;

/**
 * @param {string} currency
 * @returns {number}
 */
function exponentFor(currency) {
  const exponent = CURRENCY_EXPONENT[currency];
  if (exponent === undefined) {
    throw new InternalError(`No minor-unit exponent for ${currency}`);
  }
  return exponent;
}

/**
 * IDR has *no* decimal places, so "multiply by 100" overcharges by 100x —
 * the exponent must come from the currency, never be assumed.
 * @param {import("@prisma/client/runtime/library").Decimal} amount
 * @param {string} currency
 * @returns {bigint} the amount in the currency's smallest unit
 */
export function toMinor(amount, currency) {
  const exponent = exponentFor(currency);
  return BigInt(amount.mul(DECIMAL_RADIX ** exponent).toFixed(0));
}

/**
 * The inverse of {@link toMinor} — `payments.amount_minor` is the only
 * amount PayBridge charges/refunds store; this reconstructs the display
 * string from it (money is always shown at 2dp regardless of exponent,
 * matching every other money string in this API).
 * @param {bigint | number} amountMinor
 * @param {string} currency
 * @returns {string}
 */
export function fromMinor(amountMinor, currency) {
  const exponent = exponentFor(currency);
  const value = Number(amountMinor) / DECIMAL_RADIX ** exponent;
  return value.toFixed(MONEY_DISPLAY_DECIMALS);
}

/**
 * Builds a `Decimal` from a client-supplied amount string — the only
 * place outside a `*.repository.js` file allowed to reach into Prisma's
 * runtime, since this is generic decimal math, not a database query
 * (linter.md §8's containment rule targets `@prisma/client` itself, not
 * this submodule).
 * @param {string | number} value
 * @returns {import("@prisma/client/runtime/library").Decimal}
 */
export function toDecimal(value) {
  return new Decimal(value);
}

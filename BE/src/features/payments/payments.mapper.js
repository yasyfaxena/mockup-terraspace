import { fromMinor } from "../../shared/lib/money.js";

const STALE_PENDING_MINUTES = 30;
const MS_PER_MINUTE = 60_000;
const PENDING_STATES = new Set(["pending", "awaiting_payment"]);
const ZERO_MINOR = 0n;
const ISO_DATE_LENGTH = 10;

/**
 * @param {{ code: string, name: string, category: string, docsUrl?: string }} method
 * @returns {import("./payments.types.js").PaymentMethodDto}
 */
export function toPaymentMethodDto(method) {
  return { code: method.code, name: method.name, category: method.category };
}

/**
 * We only persist `paymentMethodCode`/`paymentMethodCategory`, not a
 * human-readable name (that lives on PayBridge's `/payment-methods` list) —
 * the code doubles as the display name here rather than paying for a live
 * lookup on every status check.
 * @param {import("@prisma/client").Payment} payment
 * @returns {import("./payments.types.js").PaymentMethodDto | null}
 */
function paymentMethodOf(payment) {
  if (!payment.paymentMethodCode) return null;
  return {
    code: payment.paymentMethodCode,
    name: payment.paymentMethodCode,
    category: payment.paymentMethodCategory ?? "",
  };
}

/**
 * @param {import("@prisma/client").Payment} payment
 * @param {{ id: string, reference: string, status: string }} booking
 * @returns {import("./payments.types.js").CreateChargeResponseDto}
 */
export function toCreateChargeResponseDto(payment, booking) {
  const expiresAt = new Date(payment.createdAt.getTime() + STALE_PENDING_MINUTES * MS_PER_MINUTE);
  return {
    paymentId: payment.id,
    status: payment.status,
    provider: payment.provider,
    amount: fromMinor(payment.amountMinor, payment.currency),
    amountMinor: Number(payment.amountMinor),
    currency: payment.currency,
    checkoutUrl: /** @type {string} */ (payment.checkoutUrl),
    expiresAt: expiresAt.toISOString(),
    booking,
  };
}

/**
 * @param {import("@prisma/client").Payment & { booking: { reference: string, status: string } }} payment
 * @returns {import("./payments.types.js").PaymentStatusDto}
 */
export function toPaymentStatusDto(payment) {
  return {
    paymentId: payment.id,
    status: payment.status,
    provider: payment.provider,
    amount: fromMinor(payment.amountMinor, payment.currency),
    currency: payment.currency,
    paymentMethod: paymentMethodOf(payment),
    checkoutUrl: PENDING_STATES.has(payment.status) ? payment.checkoutUrl : null,
    paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
    booking: { reference: payment.booking.reference, status: payment.booking.status },
  };
}

/**
 * @param {Array<{ amountMinor: bigint | number }>} succeededRefunds
 * @returns {bigint}
 */
function sumRefunds(succeededRefunds) {
  return succeededRefunds.reduce((sum, refund) => sum + BigInt(refund.amountMinor), ZERO_MINOR);
}

/**
 * The staff list shape (payments.md §9).
 * @param {any} payment
 * @returns {object}
 */
export function toAdminPaymentListItemDto(payment) {
  const refundedMinor = sumRefunds(payment.refunds ?? []);
  return {
    id: payment.id,
    status: payment.status,
    provider: payment.provider,
    amount: fromMinor(payment.amountMinor, payment.currency),
    currency: payment.currency,
    paymentMethod: paymentMethodOf(payment),
    paybridgeOrderId: payment.paybridgeOrderId,
    refundedAmount: fromMinor(refundedMinor, payment.currency),
    booking: {
      id: payment.booking.id,
      reference: payment.booking.reference,
      bookingDate: payment.booking.bookingDate.toISOString().slice(0, ISO_DATE_LENGTH),
    },
    customer: payment.booking.user,
    paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
    createdAt: payment.createdAt.toISOString(),
  };
}

/**
 * The staff detail shape (payments.md §10). `events` never exposes
 * `signature`/`rawBody` — audit data, not an API surface.
 * @param {any} payment
 * @returns {object}
 */
export function toAdminPaymentDetailDto(payment) {
  return {
    id: payment.id,
    status: payment.status,
    provider: payment.provider,
    amount: fromMinor(payment.amountMinor, payment.currency),
    amountMinor: Number(payment.amountMinor),
    currency: payment.currency,
    paybridgeChargeId: payment.paybridgeChargeId,
    paybridgeOrderId: payment.paybridgeOrderId,
    providerChargeId: payment.providerChargeId,
    paymentMethod: paymentMethodOf(payment),
    booking: { id: payment.booking.id, reference: payment.booking.reference },
    customer: payment.booking.user,
    refunds: payment.refunds.map((/** @type {any} */ refund) => ({
      id: refund.id,
      amount: fromMinor(refund.amountMinor, payment.currency),
      status: refund.status,
      reason: refund.reason,
      requestedBy: refund.requestedByUser,
      createdAt: refund.createdAt.toISOString(),
    })),
    events: payment.events.map((/** @type {any} */ event) => ({
      event: event.event,
      status: event.status,
      receivedAt: event.receivedAt.toISOString(),
      processedAt: event.processedAt ? event.processedAt.toISOString() : null,
    })),
    paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
    createdAt: payment.createdAt.toISOString(),
  };
}

/**
 * @param {import("@prisma/client").Refund} refund
 * @param {string} currency the parent payment's currency — `refunds` has no currency column of its own
 * @param {{ status: string, refundedAmount: string, remainingAmount: string }} paymentSummary
 * @returns {object}
 */
export function toRefundResponseDto(refund, currency, paymentSummary) {
  return {
    id: refund.id,
    paymentId: refund.paymentId,
    amount: fromMinor(refund.amountMinor, currency),
    currency,
    status: refund.status,
    reason: refund.reason,
    payment: paymentSummary,
    createdAt: refund.createdAt.toISOString(),
  };
}

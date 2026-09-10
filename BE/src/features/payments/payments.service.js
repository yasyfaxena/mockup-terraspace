import { format } from "date-fns";
import { bookingsService as defaultBookingsService } from "../bookings/index.js";
import { NotFoundError, ProviderError, ProviderTimeout } from "../../shared/errors/http-errors.js";
import { toPaginationMeta } from "../../shared/lib/pagination.js";
import { toMinor, fromMinor, toDecimal } from "../../shared/lib/money.js";
import { logger } from "../../shared/lib/logger.js";
import { PaymentsRepository } from "./payments.repository.js";
import * as defaultPaybridgeClient from "./paybridge.client.js";
import { verifyWebhookSignature } from "./paybridge.verifier.js";
import {
  PaymentAlreadyPaidError,
  PaymentAlreadyPendingError,
  PaymentNotRefundableError,
  PaymentCustomerIncompleteError,
  RefundExceedsRemainderError,
  PaymentProviderError,
  PaymentProviderTimeout,
} from "./payments.errors.js";
import { BookingAlreadyCancelledError } from "../bookings/index.js";
import {
  toPaymentMethodDto,
  toCreateChargeResponseDto,
  toPaymentStatusDto,
  toAdminPaymentListItemDto,
  toAdminPaymentDetailDto,
  toRefundResponseDto,
} from "./payments.mapper.js";

const PENDING_STATES = new Set(["pending", "awaiting_payment"]);
const REFUNDABLE_STATES = new Set(["paid", "partially_refunded"]);
const KNOWN_EVENTS = new Set(["payment_succeeded", "payment_failed", "payment_expired"]);
const PAYMENT_METHODS_CACHE_HOURS = 1;
const MS_PER_HOUR = 3_600_000;
const MS_PER_MINUTE = 60_000;
/** @type {Record<string, string>} PayBridge `/charges/:id` status -> our PaymentState. Unmapped values are left untouched. */
const REMOTE_STATUS_MAP = Object.freeze({
  paid: "paid",
  failed: "failed",
  expired: "expired",
  awaiting_payment: "awaiting_payment",
  awaiting_method_selection: "pending",
});
const PAYMENT_NOT_FOUND_MESSAGE = "Payment not found.";
const PERCENT_MULTIPLIER = 100;
const ISO_TIME_START = 11;
const ISO_TIME_END = 16;
const ZERO_MINOR = 0n;

/** @type {Map<string, { data: import("./payments.types.js").PaymentMethodDto[], expiresAt: number }>} */
const paymentMethodsCache = new Map();

/**
 * @param {string} field camelCase Prisma field name
 * @returns {string} its `@map`ped snake_case column name
 */
function toSnakeCase(field) {
  return field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Prisma's `P2002` reports the violated columns in `meta.target` for a
 * single-column `@unique`, but leaves `meta.target` empty for a composite
 * `@@unique` on this driver/Postgres combination — the column names then
 * appear only in the error message (`` Unique constraint failed on the
 * fields: (`paybridge_order_id`,`event`) ``). Falling back to the message
 * is what makes a real duplicate webhook delivery a 200 no-op instead of
 * an uncaught 409 (payments.md §7, REG-011).
 * @param {unknown} err
 * @param {string[]} fields
 * @returns {boolean}
 */
function isUniqueViolationOn(err, fields) {
  const known = /** @type {{ code?: string, meta?: { target?: unknown }, message?: string }} */ (
    err
  );
  if (!err || typeof err !== "object" || known.code !== "P2002") return false;

  const target = known.meta?.target;
  if (Array.isArray(target) && fields.every((field) => target.includes(field))) return true;

  const message = known.message ?? "";
  return fields.every((field) => message.includes(toSnakeCase(field)));
}

/**
 * @param {{ bookingDate: Date, startTime: Date, endTime: Date }} booking
 * @returns {string}
 */
function formatBookingWhen(booking) {
  const dateStr = format(booking.bookingDate, "d MMM yyyy");
  const startStr = booking.startTime.toISOString().slice(ISO_TIME_START, ISO_TIME_END);
  const endStr = booking.endTime.toISOString().slice(ISO_TIME_START, ISO_TIME_END);
  return `${dateStr} ${startStr}–${endStr}`;
}

/**
 * @param {import("@prisma/client").Prisma.Decimal} taxAmount
 * @param {import("@prisma/client").Prisma.Decimal} subtotalAmount
 * @returns {number}
 */
function derivedTaxPercent(taxAmount, subtotalAmount) {
  if (subtotalAmount.isZero()) return 0;
  return Math.round(taxAmount.div(subtotalAmount).toNumber() * PERCENT_MULTIPLIER);
}

/** Business rules for PayBridge checkout, webhook processing, and admin refunds. */
export class PaymentsService {
  /**
   * @param {{
   *   paymentsRepository?: PaymentsRepository,
   *   bookingsService?: typeof defaultBookingsService,
   *   paybridgeClient?: typeof defaultPaybridgeClient,
   * }} [deps]
   */
  constructor(deps = {}) {
    this.repo = deps.paymentsRepository ?? new PaymentsRepository();
    this.bookings = deps.bookingsService ?? defaultBookingsService;
    this.paybridge = deps.paybridgeClient ?? defaultPaybridgeClient;
  }

  /**
   * Cached for an hour — the list is near-static and every call costs a
   * signed round trip (payments.md §5).
   * @param {string} provider
   * @returns {Promise<{ provider: string, data: import("./payments.types.js").PaymentMethodDto[] }>}
   */
  async listPaymentMethods(provider) {
    const cached = paymentMethodsCache.get(provider);
    if (cached && cached.expiresAt > Date.now()) {
      return { provider, data: cached.data };
    }

    /** @type {any[]} */
    let methods;
    try {
      methods = await this.paybridge.listPaymentMethods(provider);
    } catch (err) {
      throw translateProviderError(err);
    }

    const data = methods.map(toPaymentMethodDto);
    paymentMethodsCache.set(provider, {
      data,
      expiresAt: Date.now() + PAYMENT_METHODS_CACHE_HOURS * MS_PER_HOUR,
    });
    return { provider, data };
  }

  /**
   * @param {string} userId
   * @param {string} bookingId
   * @param {{ provider: string }} data
   * @throws {NotFoundError} booking not found, or belongs to another user
   * @throws {BookingAlreadyCancelledError}
   * @throws {PaymentAlreadyPaidError}
   * @throws {PaymentAlreadyPendingError}
   * @throws {PaymentCustomerIncompleteError}
   * @returns {Promise<import("./payments.types.js").CreateChargeResponseDto>}
   */
  async createCharge(userId, bookingId, data) {
    const booking = await this.bookings.getOwnedById(userId, bookingId);
    if (booking.status === "cancelled") throw new BookingAlreadyCancelledError();
    if (!booking.user.phone) throw new PaymentCustomerIncompleteError();

    const latest = await this.repo.findLatestForBooking(booking.id);
    if (latest?.status === "paid") throw new PaymentAlreadyPaidError();
    if (latest && PENDING_STATES.has(latest.status)) throw new PaymentAlreadyPendingError();

    const amountMinor = toMinor(booking.totalAmount, booking.currency);
    const subtotalMinor = toMinor(booking.subtotalAmount, booking.currency);
    const taxMinor = toMinor(booking.taxAmount, booking.currency);
    const taxPercent = derivedTaxPercent(booking.taxAmount, booking.subtotalAmount);

    let charge;
    try {
      charge = await this.paybridge.createCharge({
        provider: data.provider,
        amount: Number(amountMinor),
        currency: booking.currency,
        customer: {
          name: booking.user.name,
          email: booking.user.email,
          mobileNumber: booking.user.phone,
        },
        description: `TerraSpace booking ${booking.reference} — ${booking.workspace.name}, ${formatBookingWhen(booking)}`,
        items: [
          {
            name: `${booking.workspace.name} (${booking.durationHours}h)`,
            quantity: 1,
            price: Number(subtotalMinor),
            description: booking.workspace.location.name,
          },
          { name: `Tax (${taxPercent}%)`, quantity: 1, price: Number(taxMinor) },
        ],
        metadata: { bookingId: booking.id, bookingReference: booking.reference },
      });
    } catch (err) {
      throw translateProviderError(err);
    }

    // Written before the redirect — if this fails after PayBridge already
    // returned a charge, the webhook has nothing to attribute it to
    // (payments.md §6 rule 3).
    const payment = await this.repo.create({
      bookingId: booking.id,
      provider: data.provider,
      paybridgeChargeId: charge.id,
      paybridgeOrderId: charge.orderId,
      amountMinor,
      currency: booking.currency,
      status: "pending",
      checkoutUrl: charge.checkoutUrl,
    });

    return toCreateChargeResponseDto(payment, {
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
    });
  }

  /**
   * @param {string} userId
   * @param {string} reference
   * @throws {NotFoundError} booking not found/not owned, or no payment exists yet
   * @returns {Promise<import("./payments.types.js").PaymentStatusDto>}
   */
  async getPaymentStatus(userId, reference) {
    const booking = await this.bookings.getByReference(userId, reference);
    const payment = await this.repo.findLatestForBooking(booking.id);
    if (!payment) throw new NotFoundError("No payment found for this booking.");

    return toPaymentStatusDto({
      ...payment,
      booking: { reference: booking.reference, status: booking.status },
    });
  }

  /**
   * Verifies and processes one PayBridge webhook delivery. Never throws
   * for a business outcome (unknown `orderId`, amount mismatch, a
   * processing exception) — those are recorded and still acknowledged
   * with `200`; only signature verification failure changes the response
   * (payments.md §7).
   * @param {{ method: string, path: string, rawBody: string, headers: Record<string, string | undefined> }} request
   * @returns {Promise<{ verified: boolean }>}
   */
  async processWebhook({ method, path, rawBody, headers }) {
    const verified = await verifyWebhookSignature({ method, path, rawBody, headers });
    if (!verified) return { verified: false };

    await this.#recordAndProcess(rawBody, headers);
    return { verified: true };
  }

  /**
   * @param {string} rawBody
   * @param {Record<string, string | undefined>} headers
   * @returns {Promise<void>}
   */
  async #recordAndProcess(rawBody, headers) {
    /** @type {{ event: string, orderId: string, amount: number, currency: string, provider: string }} */
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      logger.error({ rawBody }, "PayBridge webhook: valid signature but unparseable body");
      return;
    }

    let event;
    try {
      event = await this.repo.createEvent({
        paybridgeOrderId: body.orderId,
        event: body.event,
        nonce: headers["x-nonce"],
        keyId: headers["x-key-id"],
        signature: headers["x-signature"],
        rawBody,
        status: "received",
      });
    } catch (err) {
      if (isUniqueViolationOn(err, ["nonce"])) return; // replayed delivery — no-op
      if (isUniqueViolationOn(err, ["paybridgeOrderId", "event"])) return; // duplicate delivery — no-op
      throw err;
    }

    try {
      await this.#applyEvent(event, body);
    } catch (err) {
      await this.repo.updateEvent(event.id, {
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        processedAt: new Date(),
      });
      logger.error(
        { err, eventId: event.id },
        "PayBridge webhook processing failed — queued for replay",
      );
    }
  }

  /**
   * @param {import("@prisma/client").PaymentEvent} event
   * @param {{ event: string, orderId: string, amount: number, currency: string }} body
   * @returns {Promise<void>}
   */
  async #applyEvent(event, body) {
    const payment = await this.repo.findByOrderId(body.orderId);
    if (!payment) {
      await this.repo.updateEvent(event.id, { status: "ignored", processedAt: new Date() });
      logger.error({ orderId: body.orderId }, "PayBridge webhook: unknown orderId");
      return;
    }

    if (!KNOWN_EVENTS.has(body.event)) {
      await this.repo.updateEvent(event.id, {
        paymentId: payment.id,
        status: "ignored",
        processedAt: new Date(),
      });
      return;
    }

    const amountMatches = BigInt(body.amount) === BigInt(payment.amountMinor);
    const currencyMatches = body.currency === payment.currency;
    if (!amountMatches || !currencyMatches) {
      await this.repo.updateEvent(event.id, {
        paymentId: payment.id,
        status: "failed",
        error: "amount/currency mismatch",
        processedAt: new Date(),
      });
      logger.error(
        { paymentId: payment.id, expected: String(payment.amountMinor), received: body.amount },
        "PayBridge webhook: amount mismatch — not marking paid",
      );
      return;
    }

    await this.repo.transaction(async (tx) => {
      if (body.event === "payment_succeeded") {
        await this.repo.update(payment.id, { status: "paid", paidAt: new Date() }, tx);
        await this.bookings.confirmFromPayment(payment.bookingId, tx);
      } else if (body.event === "payment_failed") {
        await this.repo.update(payment.id, { status: "failed", failedAt: new Date() }, tx);
        await this.bookings.setPaymentFailed(payment.bookingId, tx);
      } else {
        await this.repo.update(payment.id, { status: "expired", expiredAt: new Date() }, tx);
        await this.bookings.cancelFromPaymentExpiry(payment.bookingId, tx);
      }
    });

    await this.repo.updateEvent(event.id, {
      paymentId: payment.id,
      status: "processed",
      processedAt: new Date(),
    });
  }

  /**
   * @param {{ status?: string, provider?: string, method?: string, from?: string, to?: string, q?: string, page: number, limit: number }} query
   * @returns {Promise<{ data: object[], meta: import("../../shared/types/pagination.js").PaginationMeta }>}
   */
  async listAdmin(query) {
    const { rows, total } = await this.repo.findAllAdmin(query);
    return {
      data: rows.map(toAdminPaymentListItemDto),
      meta: toPaginationMeta({ page: query.page, limit: query.limit, total }),
    };
  }

  /**
   * @param {string} id
   * @throws {NotFoundError}
   * @returns {Promise<object>}
   */
  async getAdminDetail(id) {
    const payment = await this.repo.findByIdAdmin(id);
    if (!payment) throw new NotFoundError(PAYMENT_NOT_FOUND_MESSAGE);
    return toAdminPaymentDetailDto(payment);
  }

  /**
   * Synchronous — a `201` from PayBridge means the money already moved,
   * there is no pending webhook to wait for (payments.md §11 rule 1).
   * @param {string} id
   * @param {{ amount?: string, reason?: string }} data
   * @param {string} requestedBy
   * @throws {NotFoundError}
   * @throws {PaymentNotRefundableError}
   * @throws {RefundExceedsRemainderError}
   * @returns {Promise<object>}
   */
  async refund(id, data, requestedBy) {
    const payment = await this.repo.findById(id);
    if (!payment) throw new NotFoundError(PAYMENT_NOT_FOUND_MESSAGE);
    if (!REFUNDABLE_STATES.has(payment.status)) throw new PaymentNotRefundableError();

    const refundedMinor = await this.repo.sumSucceededRefunds(id);
    const remainingMinor = BigInt(payment.amountMinor) - refundedMinor;
    const requestedMinor =
      data.amount !== undefined
        ? toMinor(toDecimal(data.amount), payment.currency)
        : remainingMinor;

    if (requestedMinor <= ZERO_MINOR || requestedMinor > remainingMinor) {
      throw new RefundExceedsRemainderError();
    }

    let providerRefund;
    try {
      providerRefund = await this.paybridge.createRefund({
        chargeId: payment.paybridgeChargeId,
        amount: Number(requestedMinor),
        reason: data.reason,
      });
    } catch (err) {
      throw translateProviderError(err);
    }

    const refund = await this.repo.createRefund({
      paymentId: payment.id,
      paybridgeRefundId: providerRefund.id,
      amountMinor: requestedMinor,
      reason: data.reason ?? null,
      status: "succeeded",
      requestedBy,
    });

    const newRefundedMinor = refundedMinor + requestedMinor;
    const newStatus =
      newRefundedMinor >= BigInt(payment.amountMinor) ? "refunded" : "partially_refunded";
    await this.repo.update(payment.id, { status: newStatus });

    return toRefundResponseDto(refund, payment.currency, {
      status: newStatus,
      refundedAmount: fromMinor(newRefundedMinor, payment.currency),
      remainingAmount: fromMinor(BigInt(payment.amountMinor) - newRefundedMinor, payment.currency),
    });
  }

  /**
   * Cancels bookings still `pending` with no `paid` payment past
   * `staleMinutes` — the backstop for a `payment_expired` webhook that
   * never arrives (payments.md §12).
   * @param {number} staleMinutes
   * @returns {Promise<{ swept: number }>}
   */
  async sweepStalePending(staleMinutes) {
    const cutoff = new Date(Date.now() - staleMinutes * MS_PER_MINUTE);
    const bookings = await this.repo.findStalePendingBookings(cutoff);

    for (const booking of bookings) {
      const latest = await this.repo.findLatestForBooking(booking.id);
      if (latest && PENDING_STATES.has(latest.status)) {
        await this.repo.update(latest.id, { status: "expired", expiredAt: new Date() });
      }
      await this.bookings.cancelFromPaymentExpiry(booking.id);
    }

    return { swept: bookings.length };
  }

  /**
   * Reprocesses `payment_events` rows stuck `received`/`failed` past
   * `staleMinutes` — safe because processing is idempotent (payments.md
   * §12).
   * @param {number} staleMinutes
   * @returns {Promise<{ replayed: number }>}
   */
  async replayFailedEvents(staleMinutes) {
    const cutoff = new Date(Date.now() - staleMinutes * MS_PER_MINUTE);
    const events = await this.repo.findReplayableEvents(cutoff);

    for (const event of events) {
      try {
        await this.#applyEvent(event, JSON.parse(event.rawBody));
      } catch (err) {
        await this.repo.updateEvent(event.id, {
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          processedAt: new Date(),
        });
      }
    }

    return { replayed: events.length };
  }

  /**
   * Compares `payments` still `pending`/`awaiting_payment` past
   * `staleMinutes` against PayBridge's own record and corrects drift —
   * the safety net for a webhook lost during an outage on our side
   * (payments.md §12).
   * @param {number} staleMinutes
   * @returns {Promise<{ checked: number, corrected: number }>}
   */
  async reconcile(staleMinutes) {
    const cutoff = new Date(Date.now() - staleMinutes * MS_PER_MINUTE);
    const payments = await this.repo.findReconcilable(cutoff);
    let corrected = 0;

    for (const payment of payments) {
      let remote;
      try {
        remote = await this.paybridge.getCharge(payment.paybridgeChargeId);
      } catch (err) {
        logger.error(
          { err, paymentId: payment.id },
          "Reconciliation: unable to fetch charge from PayBridge",
        );
        continue;
      }

      const nextStatus = REMOTE_STATUS_MAP[remote.status];
      if (!nextStatus || nextStatus === payment.status) continue;

      await this.repo.update(payment.id, {
        status: nextStatus,
        ...(nextStatus === "paid" ? { paidAt: new Date() } : {}),
      });
      if (nextStatus === "paid") await this.bookings.confirmFromPayment(payment.bookingId);
      corrected += 1;
    }

    return { checked: payments.length, corrected };
  }
}

/**
 * @param {unknown} err
 * @returns {PaymentProviderTimeout | PaymentProviderError | unknown}
 */
function translateProviderError(err) {
  if (err instanceof ProviderTimeout) return new PaymentProviderTimeout(err.message);
  if (err instanceof ProviderError) return new PaymentProviderError(err.message);
  return err;
}

export const paymentsService = new PaymentsService();

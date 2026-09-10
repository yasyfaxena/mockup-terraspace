import { prisma } from "../../shared/database/client.js";

const CUSTOMER_SELECT = { id: true, name: true, email: true };
const BOOKING_SUMMARY_SELECT = { id: true, reference: true, status: true, bookingDate: true };
const ZERO_MINOR = 0n;

/** Prisma access for `payments`, `payment_events`, and `refunds`. */
export class PaymentsRepository {
  /** @param {{ db?: import("@prisma/client").PrismaClient }} [deps] */
  constructor(deps = {}) {
    this.db = deps.db ?? prisma;
  }

  /**
   * @param {Record<string, unknown>} data
   * @param {import("@prisma/client").Prisma.TransactionClient} [client]
   * @returns {Promise<import("@prisma/client").Payment>}
   */
  create(data, client = this.db) {
    return client.payment.create({ data: /** @type {any} */ (data) });
  }

  /**
   * @param {string} id
   * @param {Record<string, unknown>} data
   * @param {import("@prisma/client").Prisma.TransactionClient} [client]
   * @returns {Promise<import("@prisma/client").Payment>}
   */
  update(id, data, client = this.db) {
    return client.payment.update({ where: { id }, data: /** @type {any} */ (data) });
  }

  /**
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Payment | null>}
   */
  findById(id) {
    return this.db.payment.findUnique({ where: { id } });
  }

  /**
   * The webhook join key — the only way an incoming event resolves to a
   * booking (payments.md §1). Includes the booking for the update
   * transaction that follows.
   * @param {string} orderId
   * @returns {Promise<(import("@prisma/client").Payment & { booking: import("@prisma/client").Booking }) | null>}
   */
  findByOrderId(orderId) {
    return this.db.payment.findUnique({
      where: { paybridgeOrderId: orderId },
      include: { booking: true },
    });
  }

  /**
   * Most recent payment attempt for a booking — a booking may have
   * several (retry after expiry).
   * @param {string} bookingId
   * @returns {Promise<import("@prisma/client").Payment | null>}
   */
  findLatestForBooking(bookingId) {
    return this.db.payment.findFirst({
      where: { bookingId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * @param {{
   *   status?: string, provider?: string, method?: string, from?: string, to?: string, q?: string,
   *   page: number, limit: number,
   * }} params
   * @returns {Promise<{ rows: any[], total: number }>}
   */
  async findAllAdmin(params) {
    const createdAtRange = {
      ...(params.from ? { gte: new Date(`${params.from}T00:00:00.000Z`) } : {}),
      ...(params.to ? { lte: new Date(`${params.to}T23:59:59.999Z`) } : {}),
    };

    const where = /** @type {import("@prisma/client").Prisma.PaymentWhereInput} */ ({
      ...(params.status ? { status: params.status } : {}),
      ...(params.provider ? { provider: params.provider } : {}),
      ...(params.method ? { paymentMethodCode: params.method } : {}),
      ...(Object.keys(createdAtRange).length > 0 ? { createdAt: createdAtRange } : {}),
      ...(params.q
        ? {
            OR: [
              { paybridgeOrderId: { contains: params.q, mode: "insensitive" } },
              { booking: { reference: { contains: params.q, mode: "insensitive" } } },
              { booking: { user: { name: { contains: params.q, mode: "insensitive" } } } },
              { booking: { user: { email: { contains: params.q, mode: "insensitive" } } } },
            ],
          }
        : {}),
    });

    const [rows, total] = await Promise.all([
      this.db.payment.findMany({
        where,
        include: {
          booking: { select: { ...BOOKING_SUMMARY_SELECT, user: { select: CUSTOMER_SELECT } } },
          refunds: { where: { status: "succeeded" }, select: { amountMinor: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.db.payment.count({ where }),
    ]);

    return { rows, total };
  }

  /**
   * @param {string} id
   * @returns {Promise<any>}
   */
  findByIdAdmin(id) {
    return this.db.payment.findUnique({
      where: { id },
      include: {
        booking: { select: { ...BOOKING_SUMMARY_SELECT, user: { select: CUSTOMER_SELECT } } },
        refunds: { include: { requestedByUser: { select: { id: true, name: true } } } },
        events: {
          select: { event: true, status: true, receivedAt: true, processedAt: true },
          orderBy: { receivedAt: "asc" },
        },
      },
    });
  }

  /**
   * @param {Record<string, unknown>} data
   * @param {import("@prisma/client").Prisma.TransactionClient} [client]
   * @returns {Promise<import("@prisma/client").PaymentEvent>}
   */
  createEvent(data, client = this.db) {
    return client.paymentEvent.create({ data: /** @type {any} */ (data) });
  }

  /**
   * @param {string} id
   * @param {Record<string, unknown>} data
   * @returns {Promise<import("@prisma/client").PaymentEvent>}
   */
  updateEvent(id, data) {
    return this.db.paymentEvent.update({ where: { id }, data });
  }

  /**
   * Events `received`/`failed` older than `cutoff` — replay candidates
   * (payments.md §12).
   * @param {Date} cutoff
   * @returns {Promise<import("@prisma/client").PaymentEvent[]>}
   */
  findReplayableEvents(cutoff) {
    return this.db.paymentEvent.findMany({
      where: { status: { in: ["received", "failed"] }, receivedAt: { lt: cutoff } },
      orderBy: { receivedAt: "asc" },
    });
  }

  /**
   * @param {string} paymentId
   * @returns {Promise<bigint>}
   */
  async sumSucceededRefunds(paymentId) {
    const result = await this.db.refund.aggregate({
      where: { paymentId, status: "succeeded" },
      _sum: { amountMinor: true },
    });
    return result._sum.amountMinor ?? ZERO_MINOR;
  }

  /**
   * @param {Record<string, unknown>} data
   * @returns {Promise<import("@prisma/client").Refund>}
   */
  createRefund(data) {
    return this.db.refund.create({ data: /** @type {any} */ (data) });
  }

  /**
   * Bookings still `pending` with no `paid` payment, older than `cutoff`
   * — the stale-pending sweep backstop (payments.md §12).
   * @param {Date} cutoff
   * @returns {Promise<import("@prisma/client").Booking[]>}
   */
  findStalePendingBookings(cutoff) {
    return this.db.booking.findMany({
      where: {
        status: "pending",
        createdAt: { lt: cutoff },
        payments: { none: { status: "paid" } },
      },
    });
  }

  /**
   * Payments still `pending`/`awaiting_payment` older than `cutoff` —
   * reconciliation candidates (payments.md §12).
   * @param {Date} cutoff
   * @returns {Promise<import("@prisma/client").Payment[]>}
   */
  findReconcilable(cutoff) {
    return this.db.payment.findMany({
      where: { status: { in: ["pending", "awaiting_payment"] }, createdAt: { lt: cutoff } },
    });
  }

  /**
   * @param {(tx: import("@prisma/client").Prisma.TransactionClient) => Promise<any>} run
   * @returns {Promise<any>}
   */
  transaction(run) {
    return this.db.$transaction(run);
  }
}

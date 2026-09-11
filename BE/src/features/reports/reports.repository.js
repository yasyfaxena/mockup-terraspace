import { prisma } from "../../shared/database/client.js";

const SCHEDULE_LIMIT = 100;
const DATE_TRUNC_UNIT = Object.freeze({ day: "day", week: "week", month: "month" });
const BOOKING_DATE_RANGE_CONDITION = "b.booking_date BETWEEN $1::date AND $2::date";
const PAID_FILTER = "FILTER (WHERE b.payment_status = 'paid')";

/**
 * Read-only aggregate SQL for the admin dashboard. Owns no table — every
 * query here reaches across `bookings`, `workspaces`, `locations`,
 * `payments`, `refunds` and `users` (reports.md's one exception to
 * per-feature table ownership).
 *
 * `bookings.booking_date` is a bare `DATE` chosen at booking time to
 * represent the venue's own calendar day (bookings.md, libraries.md §11)
 * — grouping or filtering by it is already venue-local with no `AT TIME
 * ZONE` conversion needed. Only `users.created_at`/`payments.paid_at`
 * (real `TIMESTAMPTZ` columns) need explicit conversion, and only
 * `overview` touches one of those for day-bucketing.
 */
export class ReportsRepository {
  /** @param {{ db?: import("@prisma/client").PrismaClient }} [deps] */
  constructor(deps = {}) {
    this.db = deps.db ?? prisma;
  }

  /**
   * Bookable workspaces (excludes `disabled`/`maintenance`), bucketed by
   * whether their location is 24/7 — the two open-hour spans this
   * platform recognizes (`shared/constants/hours.js`).
   * @param {string} [locationId]
   * @returns {Promise<Array<{ access247: boolean, count: number }>>}
   */
  bookableWorkspaceCounts(locationId) {
    return /** @type {any} */ (
      this.db.$queryRawUnsafe(
        `SELECT l.access_24_7 AS "access247", COUNT(w.id)::int AS count
         FROM workspaces w JOIN locations l ON l.id = w.location_id
         WHERE w.availability NOT IN ('disabled', 'maintenance')
           ${locationId ? "AND w.location_id = $1::uuid" : ""}
         GROUP BY l.access_24_7`,
        ...(locationId ? [locationId] : []),
      )
    );
  }

  /**
   * @param {{ date: string, locationId?: string, timezone: string }} params
   * @returns {Promise<{
   *   bookingCounts: { total: number, confirmed: number, cancelled: number },
   *   revenue: string,
   *   currency: string | null,
   *   bookedHours: string,
   *   bookableWorkspaces: Array<{ access247: boolean, count: number }>,
   *   newCustomers: number,
   *   schedule: any[],
   * }>}
   */
  async overview({ date, locationId, timezone }) {
    const locationFilter = locationId ? "AND w.location_id = $2::uuid" : "";
    const values = locationId ? [date, locationId] : [date];

    const [bookingRows, revenueRows, hoursRows, workspaceRows, customerRows, schedule] =
      await Promise.all([
        this.db.$queryRawUnsafe(
          `SELECT
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE b.status = 'confirmed')::int AS confirmed,
             COUNT(*) FILTER (WHERE b.status = 'cancelled')::int AS cancelled
           FROM bookings b JOIN workspaces w ON w.id = b.workspace_id
           WHERE b.booking_date = $1::date ${locationFilter}`,
          ...values,
        ),
        this.db.$queryRawUnsafe(
          `SELECT COALESCE(SUM(b.total_amount), 0) AS revenue, MIN(b.currency) AS currency
           FROM bookings b JOIN workspaces w ON w.id = b.workspace_id
           WHERE b.booking_date = $1::date AND b.payment_status = 'paid' ${locationFilter}`,
          ...values,
        ),
        this.db.$queryRawUnsafe(
          `SELECT COALESCE(SUM(b.duration_hours), 0) AS booked_hours
           FROM bookings b JOIN workspaces w ON w.id = b.workspace_id
           WHERE b.booking_date = $1::date AND b.status != 'cancelled' ${locationFilter}`,
          ...values,
        ),
        this.bookableWorkspaceCounts(locationId),
        this.db.$queryRawUnsafe(
          `SELECT COUNT(*)::int AS count FROM users
           WHERE ((created_at AT TIME ZONE 'UTC') AT TIME ZONE $2)::date = $1::date`,
          date,
          timezone,
        ),
        this.db.$queryRawUnsafe(
          `SELECT
             b.id, b.reference, b.start_time AS "startTime", b.end_time AS "endTime",
             b.status, b.payment_status AS "paymentStatus", b.total_amount AS "totalAmount",
             w.name AS "workspaceName", l.name AS "locationName", u.name AS "customerName"
           FROM bookings b
             JOIN workspaces w ON w.id = b.workspace_id
             JOIN locations l ON l.id = w.location_id
             JOIN users u ON u.id = b.user_id
           WHERE b.booking_date = $1::date ${locationFilter}
           ORDER BY b.start_time ASC
           LIMIT ${SCHEDULE_LIMIT}`,
          ...values,
        ),
      ]);

    return {
      bookingCounts: /** @type {any} */ (bookingRows)[0],
      revenue: /** @type {any} */ (revenueRows)[0].revenue.toString(),
      currency: /** @type {any} */ (revenueRows)[0].currency,
      bookedHours: /** @type {any} */ (hoursRows)[0].booked_hours.toString(),
      bookableWorkspaces: /** @type {any} */ (workspaceRows),
      newCustomers: /** @type {any} */ (customerRows)[0].count,
      schedule: /** @type {any} */ (schedule),
    };
  }

  /**
   * @param {{ from: string, to: string, groupBy: "day"|"week"|"month", locationId?: string, workspaceType?: string }} params
   * @returns {Promise<{ byCurrency: any[], byLocation: any[], byWorkspaceType: any[], series: any[], refundsByCurrency: any[] }>}
   */
  async revenue({ from, to, groupBy, locationId, workspaceType }) {
    const conditions = [BOOKING_DATE_RANGE_CONDITION];
    const values = [from, to];
    if (locationId) {
      values.push(locationId);
      conditions.push(`w.location_id = $${values.length}::uuid`);
    }
    if (workspaceType) {
      values.push(workspaceType);
      conditions.push(`w.type = $${values.length}::workspace_type`);
    }
    const whereSql = conditions.join(" AND ");
    const trunc = DATE_TRUNC_UNIT[groupBy];

    const [byCurrency, byLocation, byWorkspaceType, series, refundsByCurrency] = await Promise.all([
      this.#revenueByCurrency(whereSql, values),
      this.#revenueByLocation(whereSql, values),
      this.#revenueByWorkspaceType(whereSql, values),
      this.#revenueSeries(whereSql, values, trunc),
      this.#refundsByCurrency(whereSql, values),
    ]);

    return {
      byCurrency: /** @type {any} */ (byCurrency),
      byLocation: /** @type {any} */ (byLocation),
      byWorkspaceType: /** @type {any} */ (byWorkspaceType),
      series: /** @type {any} */ (series),
      refundsByCurrency: /** @type {any} */ (refundsByCurrency),
    };
  }

  /**
   * @param {string} whereSql
   * @param {unknown[]} values
   * @returns {Promise<any[]>}
   */
  #revenueByCurrency(whereSql, values) {
    return /** @type {any} */ (
      this.db.$queryRawUnsafe(
        `SELECT
           b.currency,
           COALESCE(SUM(b.total_amount) ${PAID_FILTER}, 0) AS gross_revenue,
           COALESCE(SUM(b.tax_amount) ${PAID_FILTER}, 0) AS tax_collected,
           COUNT(*) ${PAID_FILTER}::int AS paid_count,
           COUNT(*)::int AS total_count,
           COUNT(*) FILTER (WHERE b.status = 'cancelled')::int AS cancelled_count
         FROM bookings b JOIN workspaces w ON w.id = b.workspace_id
         WHERE ${whereSql}
         GROUP BY b.currency`,
        ...values,
      )
    );
  }

  /**
   * @param {string} whereSql
   * @param {unknown[]} values
   * @returns {Promise<any[]>}
   */
  #revenueByLocation(whereSql, values) {
    return /** @type {any} */ (
      this.db.$queryRawUnsafe(
        `SELECT
           b.currency, l.id AS "locationId", l.name AS "locationName",
           COALESCE(SUM(b.total_amount) ${PAID_FILTER}, 0) AS net_revenue,
           COUNT(*) ${PAID_FILTER}::int AS booking_count
         FROM bookings b
           JOIN workspaces w ON w.id = b.workspace_id
           JOIN locations l ON l.id = w.location_id
         WHERE ${whereSql}
         GROUP BY b.currency, l.id, l.name`,
        ...values,
      )
    );
  }

  /**
   * @param {string} whereSql
   * @param {unknown[]} values
   * @returns {Promise<any[]>}
   */
  #revenueByWorkspaceType(whereSql, values) {
    return /** @type {any} */ (
      this.db.$queryRawUnsafe(
        `SELECT
           b.currency, w.type,
           COALESCE(SUM(b.total_amount) ${PAID_FILTER}, 0) AS net_revenue,
           COUNT(*) ${PAID_FILTER}::int AS booking_count
         FROM bookings b JOIN workspaces w ON w.id = b.workspace_id
         WHERE ${whereSql}
         GROUP BY b.currency, w.type`,
        ...values,
      )
    );
  }

  /**
   * @param {string} whereSql
   * @param {unknown[]} values
   * @param {string} trunc
   * @returns {Promise<any[]>}
   */
  #revenueSeries(whereSql, values, trunc) {
    return /** @type {any} */ (
      this.db.$queryRawUnsafe(
        `SELECT
           date_trunc('${trunc}', b.booking_date)::date AS period,
           b.currency,
           COALESCE(SUM(b.total_amount) ${PAID_FILTER}, 0) AS gross_revenue,
           COUNT(*) ${PAID_FILTER}::int AS booking_count
         FROM bookings b JOIN workspaces w ON w.id = b.workspace_id
         WHERE ${whereSql}
         GROUP BY period, b.currency
         ORDER BY period ASC`,
        ...values,
      )
    );
  }

  /**
   * @param {string} whereSql
   * @param {unknown[]} values
   * @returns {Promise<any[]>}
   */
  #refundsByCurrency(whereSql, values) {
    return /** @type {any} */ (
      this.db.$queryRawUnsafe(
        `SELECT p.currency, COALESCE(SUM(r.amount_minor), 0)::text AS refunded_minor
         FROM refunds r
           JOIN payments p ON p.id = r.payment_id
           JOIN bookings b ON b.id = p.booking_id
           JOIN workspaces w ON w.id = b.workspace_id
         WHERE r.status = 'succeeded' AND ${whereSql}
         GROUP BY p.currency`,
        ...values,
      )
    );
  }

  /**
   * @param {{ from: string, to: string, locationId?: string, groupBy: "day"|"week"|"month" }} params
   * @returns {Promise<{ bookedHours: any[], series: any[], byWorkspace: any[] }>}
   */
  async occupancy({ from, to, locationId, groupBy }) {
    const conditions = [BOOKING_DATE_RANGE_CONDITION];
    const values = [from, to];
    if (locationId) {
      values.push(locationId);
      conditions.push(`w.location_id = $${values.length}::uuid`);
    }
    const whereSql = conditions.join(" AND ");
    const trunc = DATE_TRUNC_UNIT[groupBy];

    const workspaceLocationFilter = locationId ? "AND w.location_id = $3::uuid" : "";
    const workspaceValues = locationId ? [from, to, locationId] : [from, to];

    const [bookedHours, series, byWorkspace] = await Promise.all([
      this.db.$queryRawUnsafe(
        `SELECT COALESCE(SUM(b.duration_hours), 0) AS booked_hours
         FROM bookings b JOIN workspaces w ON w.id = b.workspace_id
         WHERE ${whereSql} AND b.status != 'cancelled'`,
        ...values,
      ),
      this.db.$queryRawUnsafe(
        `SELECT date_trunc('${trunc}', b.booking_date)::date AS period,
                COALESCE(SUM(b.duration_hours), 0) AS booked_hours
         FROM bookings b JOIN workspaces w ON w.id = b.workspace_id
         WHERE ${whereSql} AND b.status != 'cancelled'
         GROUP BY period ORDER BY period ASC`,
        ...values,
      ),
      this.db.$queryRawUnsafe(
        `SELECT
           w.id AS "workspaceId", w.name AS "workspaceName", w.type,
           l.name AS "locationName", l.access_24_7 AS "access247",
           COALESCE(SUM(b.duration_hours) FILTER (
             WHERE b.booking_date BETWEEN $1::date AND $2::date AND b.status != 'cancelled'
           ), 0) AS booked_hours,
           COALESCE(SUM(b.total_amount) FILTER (
             WHERE b.booking_date BETWEEN $1::date AND $2::date AND b.payment_status = 'paid'
           ), 0) AS revenue
         FROM workspaces w
           JOIN locations l ON l.id = w.location_id
           LEFT JOIN bookings b ON b.workspace_id = w.id
         WHERE w.availability NOT IN ('disabled', 'maintenance') ${workspaceLocationFilter}
         GROUP BY w.id, w.name, w.type, l.name, l.access_24_7`,
        ...workspaceValues,
      ),
    ]);

    return {
      bookedHours: /** @type {any} */ (bookedHours),
      series: /** @type {any} */ (series),
      byWorkspace: /** @type {any} */ (byWorkspace),
    };
  }

  /**
   * @param {{ from?: string, to?: string, status?: string, provider?: string, method?: string, q?: string, page: number, limit: number }} params
   * @returns {Promise<{ rows: any[], total: number, totalsByStatus: any[] }>}
   */
  async paymentsLedger(params) {
    const conditions = [];
    const values = [];
    if (params.from) {
      values.push(`${params.from}T00:00:00.000Z`);
      conditions.push(`p.created_at >= $${values.length}::timestamptz`);
    }
    if (params.to) {
      values.push(`${params.to}T23:59:59.999Z`);
      conditions.push(`p.created_at <= $${values.length}::timestamptz`);
    }
    if (params.status) {
      values.push(params.status);
      conditions.push(`p.status = $${values.length}::payment_state`);
    }
    if (params.provider) {
      values.push(params.provider);
      conditions.push(`p.provider = $${values.length}::payment_provider`);
    }
    if (params.method) {
      values.push(params.method);
      conditions.push(`p.payment_method_code = $${values.length}`);
    }
    if (params.q) {
      values.push(`%${params.q}%`);
      conditions.push(
        `(b.reference ILIKE $${values.length} OR p.paybridge_order_id ILIKE $${values.length} OR u.name ILIKE $${values.length} OR u.email ILIKE $${values.length})`,
      );
    }
    const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (params.page - 1) * params.limit;

    const rowsQuery = `
      SELECT
        p.id AS "paymentId", b.reference AS "bookingReference",
        p.status, p.provider,
        p.payment_method_code AS "paymentMethodCode", p.payment_method_category AS "paymentMethodCategory",
        p.amount_minor AS "amountMinor", p.currency,
        COALESCE((
          SELECT SUM(r.amount_minor) FROM refunds r WHERE r.payment_id = p.id AND r.status = 'succeeded'
        ), 0) AS "refundedMinor",
        u.name AS "customerName", u.email AS "customerEmail",
        b.booking_date AS "bookingDate",
        p.paid_at AS "paidAt", p.created_at AS "createdAt"
      FROM payments p
        JOIN bookings b ON b.id = p.booking_id
        JOIN users u ON u.id = b.user_id
      ${whereSql}
      ORDER BY p.created_at DESC
      LIMIT ${params.limit} OFFSET ${offset}
    `;
    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM payments p JOIN bookings b ON b.id = p.booking_id JOIN users u ON u.id = b.user_id
      ${whereSql}
    `;
    const totalsQuery = `
      SELECT p.status, p.currency, COALESCE(SUM(p.amount_minor), 0)::text AS total_minor
      FROM payments p JOIN bookings b ON b.id = p.booking_id JOIN users u ON u.id = b.user_id
      ${whereSql}
      GROUP BY p.status, p.currency
    `;

    const [rows, countRows, totalsByStatus] = await Promise.all([
      this.db.$queryRawUnsafe(rowsQuery, ...values),
      this.db.$queryRawUnsafe(countQuery, ...values),
      this.db.$queryRawUnsafe(totalsQuery, ...values),
    ]);

    return {
      rows: /** @type {any} */ (rows),
      total: /** @type {any} */ (countRows)[0].total,
      totalsByStatus: /** @type {any} */ (totalsByStatus),
    };
  }

  /**
   * @param {{ limit: number, since?: string, types?: string[] }} params
   * @returns {Promise<any[]>}
   */
  async activity({ limit, since, types }) {
    const conditions = [];
    const values = [];
    if (since) {
      values.push(since);
      conditions.push(`occurred_at > $${values.length}::timestamptz`);
    }
    if (types && types.length > 0) {
      values.push(types);
      conditions.push(`type = ANY($${values.length}::text[])`);
    }
    const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    values.push(limit);

    const query = `
      WITH events AS (
        SELECT
          'booking_' || b.id::text AS id, 'booking_created' AS type, b.created_at AS occurred_at,
          u.name AS actor_name, u.id::text AS actor_id,
          'booking' AS subject_kind, b.id::text AS subject_id, b.reference AS subject_reference,
          jsonb_build_object('workspaceName', w.name, 'bookingDate', b.booking_date) AS extra
        FROM bookings b JOIN users u ON u.id = b.user_id JOIN workspaces w ON w.id = b.workspace_id

        UNION ALL

        SELECT
          'cancel_' || b.id::text, 'booking_cancelled', b.cancelled_at,
          u.name, u.id::text,
          'booking', b.id::text, b.reference,
          jsonb_build_object('workspaceName', w.name)
        FROM bookings b JOIN users u ON u.id = b.user_id JOIN workspaces w ON w.id = b.workspace_id
        WHERE b.status = 'cancelled' AND b.cancelled_at IS NOT NULL

        UNION ALL

        SELECT
          'paid_' || p.id::text, 'payment_succeeded', p.paid_at,
          NULL, NULL,
          'payment', p.id::text, b.reference,
          jsonb_build_object('amount', p.amount_minor::text, 'currency', p.currency)
        FROM payments p JOIN bookings b ON b.id = p.booking_id
        WHERE p.status = 'paid' AND p.paid_at IS NOT NULL

        UNION ALL

        SELECT
          'failed_' || p.id::text, 'payment_failed', p.failed_at,
          NULL, NULL,
          'payment', p.id::text, b.reference,
          jsonb_build_object('amount', p.amount_minor::text, 'currency', p.currency)
        FROM payments p JOIN bookings b ON b.id = p.booking_id
        WHERE p.status = 'failed' AND p.failed_at IS NOT NULL

        UNION ALL

        SELECT
          'refund_' || r.id::text, 'payment_refunded', r.created_at,
          NULL, NULL,
          'payment', r.payment_id::text, b.reference,
          jsonb_build_object('amount', r.amount_minor::text, 'currency', p.currency)
        FROM refunds r JOIN payments p ON p.id = r.payment_id JOIN bookings b ON b.id = p.booking_id
        WHERE r.status = 'succeeded'

        UNION ALL

        SELECT
          'user_' || u.id::text, 'user_registered', u.created_at,
          u.name, u.id::text,
          'user', u.id::text, NULL,
          '{}'::jsonb
        FROM users u
      )
      SELECT id, type, occurred_at AS "occurredAt", actor_name AS "actorName", actor_id AS "actorId",
             subject_kind AS "subjectKind", subject_id AS "subjectId",
             subject_reference AS "subjectReference", extra
      FROM events
      ${whereSql}
      ORDER BY occurred_at DESC
      LIMIT $${values.length}
    `;

    return /** @type {any} */ (this.db.$queryRawUnsafe(query, ...values));
  }

  /**
   * One page of the `bookings` export, keyset-paginated on `id` rather
   * than `OFFSET` — a year of bookings must never be paged with an
   * `OFFSET` that gets slower every batch (reports.md §6).
   * @param {{ from: string, to: string, locationId?: string, cursor: string | null, batchSize: number }} params
   * @returns {Promise<any[]>}
   */
  exportBookingsBatch({ from, to, locationId, cursor, batchSize }) {
    const conditions = [BOOKING_DATE_RANGE_CONDITION];
    /** @type {Array<string | number>} */
    const values = [from, to];
    if (locationId) {
      values.push(locationId);
      conditions.push(`w.location_id = $${values.length}::uuid`);
    }
    if (cursor) {
      values.push(cursor);
      conditions.push(`b.id > $${values.length}::uuid`);
    }
    values.push(batchSize);

    return /** @type {any} */ (
      this.db.$queryRawUnsafe(
        `SELECT
           b.id, b.reference, b.booking_date AS "bookingDate",
           b.start_time AS "startTime", b.end_time AS "endTime", b.status,
           b.payment_status AS "paymentStatus", b.total_amount AS "totalAmount", b.currency,
           w.name AS "workspaceName", l.name AS "locationName", u.name AS "customerName"
         FROM bookings b
           JOIN workspaces w ON w.id = b.workspace_id
           JOIN locations l ON l.id = w.location_id
           JOIN users u ON u.id = b.user_id
         WHERE ${conditions.join(" AND ")}
         ORDER BY b.id ASC
         LIMIT $${values.length}`,
        ...values,
      )
    );
  }

  /**
   * @param {{ from: string, to: string, locationId?: string, cursor: string | null, batchSize: number }} params
   * @returns {Promise<any[]>}
   */
  exportPaymentsBatch({ from, to, locationId, cursor, batchSize }) {
    const conditions = [BOOKING_DATE_RANGE_CONDITION];
    /** @type {Array<string | number>} */
    const values = [from, to];
    if (locationId) {
      values.push(locationId);
      conditions.push(`w.location_id = $${values.length}::uuid`);
    }
    if (cursor) {
      values.push(cursor);
      conditions.push(`p.id > $${values.length}::uuid`);
    }
    values.push(batchSize);

    return /** @type {any} */ (
      this.db.$queryRawUnsafe(
        `SELECT
           p.id, p.status, p.provider, p.amount_minor AS "amountMinor", p.currency,
           p.paybridge_order_id AS "paybridgeOrderId",
           b.reference AS "bookingReference", u.name AS "customerName",
           p.paid_at AS "paidAt", p.created_at AS "createdAt"
         FROM payments p
           JOIN bookings b ON b.id = p.booking_id
           JOIN workspaces w ON w.id = b.workspace_id
           JOIN users u ON u.id = b.user_id
         WHERE ${conditions.join(" AND ")}
         ORDER BY p.id ASC
         LIMIT $${values.length}`,
        ...values,
      )
    );
  }

  /**
   * @param {{ from: string, to: string, locationId?: string, cursor: string | null, batchSize: number }} params
   * @returns {Promise<any[]>}
   */
  exportRevenueBatch({ from, to, locationId, cursor, batchSize }) {
    const conditions = [BOOKING_DATE_RANGE_CONDITION, "b.payment_status = 'paid'"];
    /** @type {Array<string | number>} */
    const values = [from, to];
    if (locationId) {
      values.push(locationId);
      conditions.push(`w.location_id = $${values.length}::uuid`);
    }
    if (cursor) {
      values.push(cursor);
      conditions.push(`b.id > $${values.length}::uuid`);
    }
    values.push(batchSize);

    return /** @type {any} */ (
      this.db.$queryRawUnsafe(
        `SELECT
           b.id, b.booking_date AS "bookingDate", b.reference,
           l.name AS "locationName", w.type AS "workspaceType",
           b.subtotal_amount AS "subtotalAmount", b.tax_amount AS "taxAmount",
           b.total_amount AS "totalAmount", b.currency
         FROM bookings b
           JOIN workspaces w ON w.id = b.workspace_id
           JOIN locations l ON l.id = w.location_id
         WHERE ${conditions.join(" AND ")}
         ORDER BY b.id ASC
         LIMIT $${values.length}`,
        ...values,
      )
    );
  }
}

export const reportsRepository = new ReportsRepository();

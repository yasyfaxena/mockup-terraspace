import { prisma } from "../../shared/database/client.js";

/** @type {Record<string, string>} */
const SORT_COLUMN = Object.freeze({
  name: "u.name",
  createdAt: "u.created_at",
  totalSpent: "total_spent",
  totalBookings: "total_bookings",
});

const ISO_DATE_LENGTH = 10;
const DEFAULT_RECENT_BOOKINGS = 10;

/** Prisma access for the `users` table, plus SQL-aggregated admin views. */
export class UsersRepository {
  /** @param {{ db?: import("@prisma/client").PrismaClient }} [deps] */
  constructor(deps = {}) {
    this.db = deps.db ?? prisma;
  }

  /**
   * @param {string} id
   * @returns {Promise<import("@prisma/client").User | null>}
   */
  findById(id) {
    return this.db.user.findUnique({ where: { id } });
  }

  /**
   * @param {string} id
   * @returns {Promise<Array<{ providerId: string, createdAt: Date }>>}
   */
  findAuthMethods(id) {
    return this.db.account.findMany({
      where: { userId: id },
      select: { providerId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * @param {string} id
   * @returns {Promise<{ totalBookings: number, upcomingBookings: number, totalSpent: unknown }>}
   */
  async getBookingStats(id) {
    const today = new Date(new Date().toISOString().slice(0, ISO_DATE_LENGTH));
    const [totalBookings, upcomingBookings, paidAggregate] = await Promise.all([
      this.db.booking.count({ where: { userId: id, status: { not: "cancelled" } } }),
      this.db.booking.count({
        where: {
          userId: id,
          status: { in: ["pending", "confirmed"] },
          bookingDate: { gte: today },
        },
      }),
      this.db.booking.aggregate({
        where: { userId: id, paymentStatus: "paid" },
        _sum: { totalAmount: true },
      }),
    ]);
    return {
      totalBookings,
      upcomingBookings,
      totalSpent: paidAggregate._sum.totalAmount ?? 0,
    };
  }

  /**
   * @param {string} id
   * @param {number} [take]
   * @returns {Promise<any[]>}
   */
  recentBookings(id, take = DEFAULT_RECENT_BOOKINGS) {
    return this.db.booking.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take,
      include: { workspace: { select: { name: true } } },
    });
  }

  /**
   * @param {string} id
   * @returns {Promise<number>}
   */
  countActiveSessions(id) {
    return this.db.session.count({ where: { userId: id, expiresAt: { gt: new Date() } } });
  }

  /**
   * Admin listing with SQL-computed aggregates — never fetches every
   * profile and every booking to reduce in application code (users.md §3).
   * @param {{ q?: string, role?: string, banned?: boolean, sort: string, order: string, page: number, limit: number }} params
   * @returns {Promise<{ rows: any[], total: number }>}
   */
  async listAdmin({ q, role, banned, sort, order, page, limit }) {
    const conditions = [];
    const values = [];

    if (q) {
      values.push(`%${q}%`);
      conditions.push(
        `(u.name ILIKE $${values.length} OR u.email ILIKE $${values.length} OR u.company ILIKE $${values.length})`,
      );
    }
    if (role) {
      values.push(role);
      conditions.push(`u.role = $${values.length}::user_role`);
    }
    if (banned !== undefined) {
      values.push(banned);
      conditions.push(`u.banned = $${values.length}`);
    }

    const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const orderColumn = SORT_COLUMN[sort] ?? SORT_COLUMN.createdAt;
    const orderDirection = order === "asc" ? "ASC" : "DESC";
    const offset = (page - 1) * limit;

    const rowsQuery = `
      SELECT
        u.id, u.email, u.name, u.phone, u.company, u.role,
        u.email_verified AS "emailVerified", u.banned, u.image,
        u.created_at AS "createdAt",
        COALESCE(b.total_bookings, 0)::int AS "totalBookings",
        COALESCE(b.total_spent, 0) AS "totalSpent",
        b.last_booking_date AS "lastBookingDate"
      FROM users u
      LEFT JOIN (
        SELECT
          user_id,
          COUNT(*) FILTER (WHERE status != 'cancelled') AS total_bookings,
          SUM(total_amount) FILTER (WHERE payment_status = 'paid') AS total_spent,
          MAX(booking_date) AS last_booking_date
        FROM bookings
        GROUP BY user_id
      ) b ON b.user_id = u.id
      ${whereSql}
      ORDER BY ${orderColumn} ${orderDirection}
      LIMIT ${limit} OFFSET ${offset}
    `;
    const countQuery = `SELECT COUNT(*)::int AS total FROM users u ${whereSql}`;

    const [rows, countRows] = await Promise.all([
      /** @type {Promise<any[]>} */ (this.db.$queryRawUnsafe(rowsQuery, ...values)),
      /** @type {Promise<Array<{ total: number }>>} */ (
        this.db.$queryRawUnsafe(countQuery, ...values)
      ),
    ]);

    return { rows, total: countRows[0].total };
  }

  /**
   * @param {string} id
   * @param {{ name?: string, phone?: string|null, company?: string|null, image?: string|null }} data
   * @returns {Promise<import("@prisma/client").User>}
   */
  updateProfile(id, data) {
    return this.db.user.update({ where: { id }, data });
  }

  /**
   * @param {string} id
   * @param {{ name?: string, phone?: string|null, company?: string|null, email?: string, emailVerified?: boolean }} data
   * @returns {Promise<import("@prisma/client").User>}
   */
  adminUpdateProfile(id, data) {
    return this.db.user.update({ where: { id }, data });
  }

  /**
   * @param {string} [excludeId]
   * @returns {Promise<number>}
   */
  countAdmins(excludeId) {
    return this.db.user.count({
      where: { role: "admin", ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
  }

  /**
   * @param {string} id
   * @returns {Promise<number>}
   */
  countBookings(id) {
    return this.db.booking.count({ where: { userId: id } });
  }

  /**
   * @param {string} email
   * @returns {Promise<import("@prisma/client").User | null>}
   */
  findByEmail(email) {
    return this.db.user.findUnique({ where: { email } });
  }

  /**
   * @param {string} id
   * @returns {Promise<import("@prisma/client").User>}
   */
  verifyEmail(id) {
    return this.db.user.update({ where: { id }, data: { emailVerified: true } });
  }
}

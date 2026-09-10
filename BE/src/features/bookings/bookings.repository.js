import { prisma } from "../../shared/database/client.js";

const ISO_DATE_LENGTH = 10;

/** @type {Record<string, string>} */
const SORT_FIELD = Object.freeze({
  bookingDate: "bookingDate",
  createdAt: "createdAt",
  totalAmount: "totalAmount",
});

const WORKSPACE_SUMMARY_SELECT = {
  id: true,
  name: true,
  type: true,
  floor: true,
  imageUrl: true,
  cancellationPolicy: true,
  location: {
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      city: true,
      timezone: true,
      latitude: true,
      longitude: true,
      accessRadiusMeters: true,
    },
  },
};

const CUSTOMER_SELECT = { id: true, name: true, email: true, phone: true, company: true };

/** Prisma access for the `bookings` table. */
export class BookingsRepository {
  /** @param {{ db?: import("@prisma/client").PrismaClient }} [deps] */
  constructor(deps = {}) {
    this.db = deps.db ?? prisma;
  }

  /**
   * Raw fields the pricing/availability checks need — not a mapped DTO.
   * @param {string} workspaceId
   * @returns {Promise<{ id: string, name: string, type: string, floor: string, pricePerHour: unknown, availability: string, location: { id: string, slug: string, name: string, address: string, city: string, status: string, timezone: string } } | null>}
   */
  findWorkspaceForBooking(workspaceId) {
    return this.db.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        type: true,
        floor: true,
        pricePerHour: true,
        availability: true,
        location: {
          select: {
            id: true,
            slug: true,
            name: true,
            address: true,
            city: true,
            status: true,
            timezone: true,
          },
        },
      },
    });
  }

  /**
   * @param {Record<string, unknown>} data
   * @param {import("@prisma/client").Prisma.TransactionClient} [client]
   * @returns {Promise<import("@prisma/client").Booking & { workspace: any }>}
   */
  create(data, client = this.db) {
    return client.booking.create({
      data: /** @type {any} */ (data),
      include: { workspace: { select: WORKSPACE_SUMMARY_SELECT } },
    });
  }

  /**
   * @param {string} id
   * @returns {Promise<(import("@prisma/client").Booking & { workspace: any }) | null>}
   */
  findById(id) {
    return this.db.booking.findUnique({
      where: { id },
      include: { workspace: { select: WORKSPACE_SUMMARY_SELECT } },
    });
  }

  /**
   * @param {string} reference
   * @returns {Promise<(import("@prisma/client").Booking & { workspace: any }) | null>}
   */
  findByReference(reference) {
    return this.db.booking.findUnique({
      where: { reference },
      include: { workspace: { select: WORKSPACE_SUMMARY_SELECT } },
    });
  }

  /**
   * @param {string} userId
   * @param {{ status?: string, scope: string, page: number, limit: number }} params
   * @returns {Promise<{ rows: Array<import("@prisma/client").Booking & { workspace: any }>, total: number }>}
   */
  async findManyForUser(userId, params) {
    const today = new Date(new Date().toISOString().slice(0, ISO_DATE_LENGTH));
    const where = /** @type {import("@prisma/client").Prisma.BookingWhereInput} */ ({
      userId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.scope === "upcoming"
        ? { bookingDate: { gte: today }, status: { not: "cancelled" } }
        : {}),
      ...(params.scope === "past"
        ? { OR: [{ bookingDate: { lt: today } }, { status: "cancelled" }] }
        : {}),
    });

    const [rows, total] = await Promise.all([
      this.db.booking.findMany({
        where,
        include: { workspace: { select: WORKSPACE_SUMMARY_SELECT } },
        orderBy: { bookingDate: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.db.booking.count({ where }),
    ]);

    return { rows, total };
  }

  /**
   * The `findAllAdmin` `where` clause — split out so each method's
   * cyclomatic complexity stays under the linter.md §3 limit.
   * @param {{
   *   status?: string, paymentStatus?: string, locationId?: string, workspaceId?: string,
   *   userId?: string, from?: string, to?: string, q?: string,
   * }} params
   * @returns {import("@prisma/client").Prisma.BookingWhereInput}
   */
  #adminWhere(params) {
    const bookingDateRange = {
      ...(params.from ? { gte: new Date(`${params.from}T00:00:00.000Z`) } : {}),
      ...(params.to ? { lte: new Date(`${params.to}T00:00:00.000Z`) } : {}),
    };

    return /** @type {import("@prisma/client").Prisma.BookingWhereInput} */ ({
      ...(params.status ? { status: params.status } : {}),
      ...(params.paymentStatus ? { paymentStatus: params.paymentStatus } : {}),
      ...(params.workspaceId ? { workspaceId: params.workspaceId } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.locationId ? { workspace: { locationId: params.locationId } } : {}),
      ...(Object.keys(bookingDateRange).length > 0 ? { bookingDate: bookingDateRange } : {}),
      ...(params.q
        ? {
            OR: [
              { reference: { contains: params.q, mode: "insensitive" } },
              { user: { name: { contains: params.q, mode: "insensitive" } } },
              { user: { email: { contains: params.q, mode: "insensitive" } } },
            ],
          }
        : {}),
    });
  }

  /**
   * @param {{
   *   status?: string, paymentStatus?: string, locationId?: string, workspaceId?: string,
   *   userId?: string, from?: string, to?: string, q?: string,
   *   sort: string, order: string, page: number, limit: number,
   * }} params
   * @returns {Promise<{ rows: Array<import("@prisma/client").Booking & { user: any, workspace: any }>, total: number }>}
   */
  async findAllAdmin(params) {
    const where = this.#adminWhere(params);

    const [rows, total] = await Promise.all([
      this.db.booking.findMany({
        where,
        include: {
          user: { select: CUSTOMER_SELECT },
          workspace: {
            select: {
              id: true,
              name: true,
              location: { select: { id: true, name: true, slug: true } },
            },
          },
        },
        orderBy: { [SORT_FIELD[params.sort] ?? "bookingDate"]: params.order },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.db.booking.count({ where }),
    ]);

    return { rows, total };
  }

  /**
   * @param {string} id
   * @returns {Promise<(import("@prisma/client").Booking & { user: any, workspace: any }) | null>}
   */
  findByIdAdmin(id) {
    return this.db.booking.findUnique({
      where: { id },
      include: {
        user: { select: CUSTOMER_SELECT },
        workspace: {
          select: {
            id: true,
            name: true,
            type: true,
            floor: true,
            location: { select: { id: true, name: true, slug: true, city: true } },
          },
        },
      },
    });
  }

  /**
   * @param {string} id
   * @param {Record<string, unknown>} data
   * @param {import("@prisma/client").Prisma.TransactionClient} [client]
   * @returns {Promise<import("@prisma/client").Booking & { workspace: any }>}
   */
  update(id, data, client = this.db) {
    return client.booking.update({
      where: { id },
      data: /** @type {any} */ (data),
      include: { workspace: { select: WORKSPACE_SUMMARY_SELECT } },
    });
  }

  /**
   * Hard delete — admin only (bookings.md §9).
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Booking>}
   */
  delete(id) {
    return this.db.booking.delete({ where: { id } });
  }

  /**
   * Bounded by the mandatory `from`/`to` range — no pagination needed (bookings.md §10).
   * @param {{ from: string, to: string, locationId?: string, workspaceId?: string }} params
   * @returns {Promise<Array<{ id: string, reference: string, status: string, bookingDate: Date, startTime: Date, endTime: Date, workspaceId: string, workspace: { name: string }, user: { name: string } }>>}
   */
  findCalendar(params) {
    return this.db.booking.findMany({
      where: /** @type {import("@prisma/client").Prisma.BookingWhereInput} */ ({
        bookingDate: {
          gte: new Date(`${params.from}T00:00:00.000Z`),
          lte: new Date(`${params.to}T00:00:00.000Z`),
        },
        ...(params.workspaceId ? { workspaceId: params.workspaceId } : {}),
        ...(params.locationId ? { workspace: { locationId: params.locationId } } : {}),
      }),
      select: {
        id: true,
        reference: true,
        status: true,
        bookingDate: true,
        startTime: true,
        endTime: true,
        workspaceId: true,
        workspace: { select: { name: true } },
        user: { select: { name: true } },
      },
      orderBy: [{ bookingDate: "asc" }, { startTime: "asc" }],
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

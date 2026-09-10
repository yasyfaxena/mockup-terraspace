import { prisma } from "../../shared/database/client.js";

/** @type {Record<string, string>} */
const SORT_FIELD = Object.freeze({
  pricePerHour: "pricePerHour",
  name: "name",
  createdAt: "createdAt",
});

const NON_DISABLED_AVAILABILITIES = Object.freeze(["available", "limited", "full", "maintenance"]);

export class WorkspacesRepository {
  /** @param {{ db?: import("@prisma/client").PrismaClient }} [deps] */
  constructor(deps = {}) {
    this.db = deps.db ?? prisma;
  }

  /**
   * `availability = 'disabled'` and workspaces at inactive locations are
   * always excluded, regardless of what the caller asks for (workspaces.md §1).
   * @param {{
   *   locationId?: string, locationSlug?: string, type?: string[], availability?: string[],
   *   amenityIds?: string[], minPrice?: number, maxPrice?: number,
   *   sort: string, order: string, page: number, limit: number,
   * }} params
   */
  async findPublic(params) {
    const allowedAvailabilities = (
      params.availability?.length ? params.availability : NON_DISABLED_AVAILABILITIES
    ).filter((value) => value !== "disabled");

    const where = /** @type {import("@prisma/client").Prisma.WorkspaceWhereInput} */ ({
      availability: { in: allowedAvailabilities },
      location: {
        status: "active",
        ...(params.locationSlug ? { slug: params.locationSlug } : {}),
      },
      ...(params.locationId ? { locationId: params.locationId } : {}),
      ...(params.type?.length ? { type: { in: params.type } } : {}),
      ...(params.minPrice !== undefined ? { pricePerHour: { gte: params.minPrice } } : {}),
      ...(params.maxPrice !== undefined ? { pricePerHour: { lte: params.maxPrice } } : {}),
      AND: (params.amenityIds ?? []).map((amenityId) => ({
        workspaceAmenities: { some: { amenityId } },
      })),
    });

    const [rows, total] = await Promise.all([
      this.db.workspace.findMany({
        where,
        include: {
          workspaceAmenities: { include: { amenity: true } },
          location: { select: { id: true, slug: true, name: true, address: true, city: true } },
        },
        orderBy: { [SORT_FIELD[params.sort] ?? "createdAt"]: params.order },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.db.workspace.count({ where }),
    ]);

    return { rows, total };
  }

  /** @param {string} id */
  findByIdPublic(id) {
    return this.db.workspace.findFirst({
      where: { id, availability: { not: "disabled" }, location: { status: "active" } },
      include: {
        workspaceAmenities: { include: { amenity: true } },
        location: { select: { id: true, slug: true, name: true, address: true, city: true } },
      },
    });
  }

  /** Bookable = not disabled, at an active location. @param {string} id */
  findBookableById(id) {
    return this.db.workspace.findFirst({
      where: { id, availability: { not: "disabled" }, location: { status: "active" } },
      include: { location: { select: { timezone: true, access247: true } } },
    });
  }

  /**
   * Includes `disabled` workspaces and those at inactive locations
   * (workspaces.md §4) — admin sees everything, not just what's bookable.
   * @param {{
   *   locationId?: string, type?: string[], availability?: string[], amenityIds?: string[],
   *   minPrice?: number, maxPrice?: number, q?: string,
   *   sort: string, order: string, page: number, limit: number,
   * }} params
   */
  async findAllAdmin(params) {
    const where = /** @type {import("@prisma/client").Prisma.WorkspaceWhereInput} */ ({
      ...(params.locationId ? { locationId: params.locationId } : {}),
      ...(params.type?.length ? { type: { in: params.type } } : {}),
      ...(params.availability?.length ? { availability: { in: params.availability } } : {}),
      ...(params.q ? { name: { contains: params.q, mode: "insensitive" } } : {}),
      ...(params.minPrice !== undefined ? { pricePerHour: { gte: params.minPrice } } : {}),
      ...(params.maxPrice !== undefined ? { pricePerHour: { lte: params.maxPrice } } : {}),
      AND: (params.amenityIds ?? []).map((amenityId) => ({
        workspaceAmenities: { some: { amenityId } },
      })),
    });

    const [rows, total] = await Promise.all([
      this.db.workspace.findMany({
        where,
        include: {
          _count: { select: { bookings: { where: { status: { not: "cancelled" } } } } },
          workspaceAmenities: { select: { amenityId: true } },
          location: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { [SORT_FIELD[params.sort] ?? "createdAt"]: params.order },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.db.workspace.count({ where }),
    ]);

    return { rows, total };
  }

  /** @param {string} id */
  findByIdAdmin(id) {
    return this.db.workspace.findUnique({
      where: { id },
      include: {
        _count: { select: { bookings: { where: { status: { not: "cancelled" } } } } },
        workspaceAmenities: { select: { amenityId: true } },
        location: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  /** @param {string} id */
  findById(id) {
    return this.db.workspace.findUnique({ where: { id } });
  }

  /** Non-cancelled bookings — the delete guard (workspaces.md §7). @param {string} id */
  countActiveBookings(id) {
    return this.db.booking.count({ where: { workspaceId: id, status: { not: "cancelled" } } });
  }

  /**
   * @param {Record<string, unknown>} data
   * @param {import("@prisma/client").Prisma.TransactionClient} [client]
   */
  create(data, client = this.db) {
    return client.workspace.create({ data: /** @type {any} */ (data) });
  }

  /**
   * @param {string} id
   * @param {Record<string, unknown>} data
   * @param {import("@prisma/client").Prisma.TransactionClient} [client]
   */
  update(id, data, client = this.db) {
    return client.workspace.update({ where: { id }, data: /** @type {any} */ (data) });
  }

  /** @param {string} id */
  delete(id) {
    return this.db.workspace.delete({ where: { id } });
  }

  /**
   * @param {string} workspaceId
   * @param {string[]} amenityIds
   * @param {import("@prisma/client").Prisma.TransactionClient} [client]
   */
  async setAmenities(workspaceId, amenityIds, client = this.db) {
    if (amenityIds.length === 0) return;
    await client.workspaceAmenity.createMany({
      data: amenityIds.map((amenityId) => ({ workspaceId, amenityId })),
    });
  }

  /**
   * @param {string} workspaceId
   * @param {string[]} amenityIds
   * @param {import("@prisma/client").Prisma.TransactionClient} [client]
   */
  async replaceAmenities(workspaceId, amenityIds, client = this.db) {
    await client.workspaceAmenity.deleteMany({ where: { workspaceId } });
    await this.setAmenities(workspaceId, amenityIds, client);
  }

  /** @param {(tx: import("@prisma/client").Prisma.TransactionClient) => Promise<any>} callback */
  transaction(callback) {
    return this.db.$transaction(callback);
  }
}

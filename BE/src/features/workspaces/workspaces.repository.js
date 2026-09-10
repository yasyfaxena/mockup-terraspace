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
}

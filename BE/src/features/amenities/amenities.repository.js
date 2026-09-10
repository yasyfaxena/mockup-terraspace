import { prisma } from "../../shared/database/client.js";

export class AmenitiesRepository {
  /** @param {{ db?: import("@prisma/client").PrismaClient }} [deps] */
  constructor(deps = {}) {
    this.db = deps.db ?? prisma;
  }

  /** @param {{ category?: string }} filters */
  findActive({ category }) {
    return this.db.amenity.findMany({
      where: { status: "active", ...(category ? { category } : {}) },
      orderBy: { name: "asc" },
    });
  }

  /** @param {{ status?: string, category?: string, q?: string }} filters */
  findAllAdmin({ status, category, q }) {
    const where = /** @type {import("@prisma/client").Prisma.AmenityWhereInput} */ ({
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    });
    return this.db.amenity.findMany({
      where,
      include: { _count: { select: { locationAmenities: true, workspaceAmenities: true } } },
      orderBy: { name: "asc" },
    });
  }

  /** @param {string} id */
  findByIdAdmin(id) {
    return this.db.amenity.findUnique({
      where: { id },
      include: { _count: { select: { locationAmenities: true, workspaceAmenities: true } } },
    });
  }

  /** @param {string} id */
  findById(id) {
    return this.db.amenity.findUnique({ where: { id } });
  }

  /** @param {string} name */
  findByName(name) {
    return this.db.amenity.findUnique({ where: { name } });
  }

  /**
   * Active amenities matching every id in `ids` — for cross-feature amenityIds validation.
   * @param {string[]} ids
   */
  findActiveByIds(ids) {
    return this.db.amenity.findMany({ where: { id: { in: ids }, status: "active" } });
  }

  /** @param {{ name: string, category?: string, icon?: string, status?: string }} data */
  create(data) {
    return this.db.amenity.create({ data: /** @type {any} */ (data) });
  }

  /**
   * @param {string} id
   * @param {{ name?: string, category?: string, icon?: string, status?: string }} data
   */
  update(id, data) {
    return this.db.amenity.update({ where: { id }, data: /** @type {any} */ (data) });
  }

  /** @param {string} id */
  delete(id) {
    return this.db.amenity.delete({ where: { id } });
  }

  /** @param {string} id */
  async countUsage(id) {
    const [locations, workspaces] = await Promise.all([
      this.db.locationAmenity.count({ where: { amenityId: id } }),
      this.db.workspaceAmenity.count({ where: { amenityId: id } }),
    ]);
    return { locations, workspaces };
  }
}

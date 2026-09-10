import { prisma } from "../../shared/database/client.js";

/** Prisma access for the `amenities` table and its two junction tables. */
export class AmenitiesRepository {
  /** @param {{ db?: import("@prisma/client").PrismaClient }} [deps] */
  constructor(deps = {}) {
    this.db = deps.db ?? prisma;
  }

  /**
   * @param {{ category?: string }} filters
   * @returns {Promise<import("@prisma/client").Amenity[]>}
   */
  findActive({ category }) {
    return this.db.amenity.findMany({
      where: { status: "active", ...(category ? { category } : {}) },
      orderBy: { name: "asc" },
    });
  }

  /**
   * @param {{ status?: string, category?: string, q?: string }} filters
   * @returns {Promise<import("@prisma/client").Amenity[]>}
   */
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

  /**
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Amenity | null>}
   */
  findByIdAdmin(id) {
    return this.db.amenity.findUnique({
      where: { id },
      include: { _count: { select: { locationAmenities: true, workspaceAmenities: true } } },
    });
  }

  /**
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Amenity | null>}
   */
  findById(id) {
    return this.db.amenity.findUnique({ where: { id } });
  }

  /**
   * @param {string} name
   * @returns {Promise<import("@prisma/client").Amenity | null>}
   */
  findByName(name) {
    return this.db.amenity.findUnique({ where: { name } });
  }

  /**
   * Active amenities matching every id in `ids` — for cross-feature amenityIds validation.
   * @param {string[]} ids
   * @returns {Promise<import("@prisma/client").Amenity[]>}
   */
  findActiveByIds(ids) {
    return this.db.amenity.findMany({ where: { id: { in: ids }, status: "active" } });
  }

  /**
   * @param {{ name: string, category?: string, icon?: string, status?: string }} data
   * @returns {Promise<import("@prisma/client").Amenity>}
   */
  create(data) {
    return this.db.amenity.create({ data: /** @type {any} */ (data) });
  }

  /**
   * @param {string} id
   * @param {{ name?: string, category?: string, icon?: string, status?: string }} data
   * @returns {Promise<import("@prisma/client").Amenity>}
   */
  update(id, data) {
    return this.db.amenity.update({ where: { id }, data: /** @type {any} */ (data) });
  }

  /**
   * @param {string} id
   * @returns {Promise<import("@prisma/client").Amenity>}
   */
  delete(id) {
    return this.db.amenity.delete({ where: { id } });
  }

  /**
   * @param {string} id
   * @returns {Promise<{ locations: number, workspaces: number }>}
   */
  async countUsage(id) {
    const [locations, workspaces] = await Promise.all([
      this.db.locationAmenity.count({ where: { amenityId: id } }),
      this.db.workspaceAmenity.count({ where: { amenityId: id } }),
    ]);
    return { locations, workspaces };
  }
}

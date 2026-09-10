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
}

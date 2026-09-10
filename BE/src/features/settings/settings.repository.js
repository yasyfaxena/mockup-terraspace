import { prisma } from "../../shared/database/client.js";

export class SettingsRepository {
  /** @param {{ db?: import("@prisma/client").PrismaClient }} [deps] */
  constructor(deps = {}) {
    this.db = deps.db ?? prisma;
  }

  /** The row is a singleton, seeded at migration time — never null (settings.md §2). */
  findSingleton() {
    return this.db.adminSettings.findUniqueOrThrow({ where: { id: true } });
  }
}

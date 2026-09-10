import { prisma } from "../../shared/database/client.js";

/** Prisma access for the `admin_settings` singleton. */
export class SettingsRepository {
  /** @param {{ db?: import("@prisma/client").PrismaClient }} [deps] */
  constructor(deps = {}) {
    this.db = deps.db ?? prisma;
  }

  /**
   * The row is a singleton, seeded at migration time — never null (settings.md §2).
   * @returns {Promise<import("@prisma/client").AdminSettings>}
   */
  findSingleton() {
    return this.db.adminSettings.findUniqueOrThrow({ where: { id: true } });
  }
}

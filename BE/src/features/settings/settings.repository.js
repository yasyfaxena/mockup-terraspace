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

  /**
   * `PUT`, not `PATCH` — but Prisma's `update` still only touches the
   * fields present in `data`, which is exactly "omitted fields keep their
   * current value" (settings.md §3) without reading-then-merging first.
   * @param {Record<string, unknown>} data
   * @returns {Promise<import("@prisma/client").AdminSettings>}
   */
  update(data) {
    return this.db.adminSettings.update({ where: { id: true }, data: /** @type {any} */ (data) });
  }
}

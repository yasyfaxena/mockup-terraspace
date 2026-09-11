import { prisma } from "../../shared/database/client.js";

/** Prisma access for Better Auth's own tables — `sessions`, `verifications`. */
export class AuthRepository {
  /** @param {{ db?: import("@prisma/client").PrismaClient }} [deps] */
  constructor(deps = {}) {
    this.db = deps.db ?? prisma;
  }

  /**
   * @param {Date} cutoff
   * @returns {Promise<number>}
   */
  async deleteExpiredSessions(cutoff) {
    const result = await this.db.session.deleteMany({ where: { expiresAt: { lt: cutoff } } });
    return result.count;
  }

  /**
   * @param {Date} cutoff
   * @returns {Promise<number>}
   */
  async deleteExpiredVerifications(cutoff) {
    const result = await this.db.verification.deleteMany({ where: { expiresAt: { lt: cutoff } } });
    return result.count;
  }
}

export const authRepository = new AuthRepository();

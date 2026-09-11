import { AuthRepository } from "./auth.repository.js";

/** Housekeeping for Better Auth's own tables (Phase 8's cron cleanup). */
export class AuthService {
  /** @param {{ authRepository?: AuthRepository }} [deps] */
  constructor(deps = {}) {
    this.repo = deps.authRepository ?? new AuthRepository();
  }

  /**
   * Deletes sessions and email/password-reset verification tokens past
   * their `expiresAt` — both are dead weight once expired, Better Auth
   * itself never reads them again.
   * @returns {Promise<{ sessions: number, verifications: number }>}
   */
  async cleanupExpired() {
    const cutoff = new Date();
    const [sessions, verifications] = await Promise.all([
      this.repo.deleteExpiredSessions(cutoff),
      this.repo.deleteExpiredVerifications(cutoff),
    ]);
    return { sessions, verifications };
  }
}

export const authService = new AuthService();

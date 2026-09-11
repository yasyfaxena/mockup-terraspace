import { authService as defaultAuthService } from "../features/auth/index.js";
import { logger as defaultLogger } from "../shared/lib/logger.js";

/**
 * Deletes expired sessions and verification tokens — Better Auth never
 * reads either past `expiresAt` (Phase 8).
 * @param {{ authService?: typeof defaultAuthService, logger?: typeof defaultLogger }} [deps]
 * @returns {Promise<void>}
 */
export async function runSessionCleanup(deps = {}) {
  const auth = deps.authService ?? defaultAuthService;
  const log = deps.logger ?? defaultLogger;

  const { sessions, verifications } = await auth.cleanupExpired();
  if (sessions > 0 || verifications > 0) {
    log.info({ sessions, verifications }, "Session cleanup removed expired rows");
  }
}

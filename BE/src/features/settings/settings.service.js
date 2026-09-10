import { logger as defaultLogger } from "../../shared/lib/logger.js";
import { SettingsRepository } from "./settings.repository.js";
import { toPublicSettingsDto, toAdminSettingsDto } from "./settings.mapper.js";

const PUBLIC_SETTINGS_CACHE_MINUTES = 5;
const MS_PER_MINUTE = 60_000;

/** @type {{ data: import("./settings.types.js").PublicSettingsDto, expiresAt: number } | null} */
let publicSettingsCache = null;

/**
 * Reading `publicSettingsCache` before an `await` and writing it after, in
 * the same function, trips `require-atomic-updates` — routing both
 * through single-purpose helpers (never both in one function) satisfies
 * the linter and matches how `paybridge.verifier.js` resolved the same
 * warning during Phase 6.
 * @returns {import("./settings.types.js").PublicSettingsDto | null}
 */
function readPublicSettingsCache() {
  if (publicSettingsCache && publicSettingsCache.expiresAt > Date.now()) {
    return publicSettingsCache.data;
  }
  return null;
}

/**
 * @param {import("./settings.types.js").PublicSettingsDto} data
 * @returns {void}
 */
function writePublicSettingsCache(data) {
  publicSettingsCache = {
    data,
    expiresAt: Date.now() + PUBLIC_SETTINGS_CACHE_MINUTES * MS_PER_MINUTE,
  };
}

/**
 * Test-only — the cache is module-level state, so integration tests that
 * seed `admin_settings` directly (bypassing `updateSettings`, which is
 * the only thing that normally invalidates it) need a way to force a
 * fresh read (matches `paybridge.verifier.js`'s `resetPlatformKeyCache`).
 * @returns {void}
 */
export function clearPublicSettingsCache() {
  publicSettingsCache = null;
}

/** Business rules for the `admin_settings` singleton (settings.md). */
export class SettingsService {
  /** @param {{ settingsRepository?: SettingsRepository, logger?: typeof defaultLogger }} [deps] */
  constructor(deps = {}) {
    this.repo = deps.settingsRepository ?? new SettingsRepository();
    this.logger = deps.logger ?? defaultLogger;
  }

  /** @returns {Promise<import("@prisma/client").AdminSettings>} */
  getSettings() {
    return this.repo.findSingleton();
  }

  /**
   * Cached for 5 minutes (settings.md §1) — every booking page load reads
   * this, and the values change rarely.
   * @returns {Promise<import("./settings.types.js").PublicSettingsDto>}
   */
  async getPublicSettings() {
    const cached = readPublicSettingsCache();
    if (cached) return cached;

    const settings = await this.repo.findSingleton();
    const data = toPublicSettingsDto(settings);
    writePublicSettingsCache(data);
    return data;
  }

  /** @returns {Promise<import("./settings.types.js").AdminSettingsDto>} */
  async getAdminSettings() {
    return toAdminSettingsDto(await this.repo.findSingleton());
  }

  /**
   * `PUT`, not `PATCH` — omitted fields keep their current value
   * (settings.md §3). Every change is audit-logged with the acting
   * admin — these values move money.
   *
   * A currency change is logged as its own warning regardless of whether
   * unpaid bookings actually exist right now: counting them would need
   * `bookings`' repository, and `bookings.service.js` already depends on
   * `settings` for tax/cancellation-window lookups — querying back would
   * make the two features import each other (`import/no-cycle`, and a
   * genuine ESM circular-import hazard, not just a lint nitpick). See
   * settings.md §3 rule 3 for this tradeoff written back into the spec.
   * @param {Record<string, unknown>} data
   * @param {string} actorId
   * @returns {Promise<import("./settings.types.js").AdminSettingsDto>}
   */
  async updateSettings(data, actorId) {
    if (data.currency !== undefined) {
      const current = await this.repo.findSingleton();
      if (data.currency !== current.currency) {
        this.logger.warn(
          { actorId, from: current.currency, to: data.currency },
          "admin_settings.currency changed — bookings already snapshotted in the old currency keep it",
        );
      }
    }

    const updated = await this.repo.update(data);
    clearPublicSettingsCache();
    this.logger.info({ actorId, changes: Object.keys(data) }, "admin_settings updated");
    return toAdminSettingsDto(updated);
  }
}

export const settingsService = new SettingsService();

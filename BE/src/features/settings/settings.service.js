import { SettingsRepository } from "./settings.repository.js";

/**
 * The `GET /settings/public` HTTP endpoint and the admin CRUD arrive in
 * Phase 7 — this is only the read path other features need in the
 * meantime (currency, tax, booking windows), reached through this
 * feature's `index.js` per be-architecture.md §7.
 */
export class SettingsService {
  /** @param {{ settingsRepository?: SettingsRepository }} [deps] */
  constructor(deps = {}) {
    this.repo = deps.settingsRepository ?? new SettingsRepository();
  }

  getSettings() {
    return this.repo.findSingleton();
  }
}

export const settingsService = new SettingsService();

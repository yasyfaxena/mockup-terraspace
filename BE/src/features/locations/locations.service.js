import { settingsService as defaultSettingsService } from "../settings/index.js";
import { NotFoundError } from "../../shared/errors/http-errors.js";
import { LocationsRepository } from "./locations.repository.js";
import { toLocationListDto, toLocationDetailDto } from "./locations.mapper.js";

export class LocationsService {
  /**
   * @param {{ locationsRepository?: LocationsRepository, settingsService?: typeof defaultSettingsService }} [deps]
   */
  constructor(deps = {}) {
    this.repo = deps.locationsRepository ?? new LocationsRepository();
    this.settings = deps.settingsService ?? defaultSettingsService;
  }

  /** @param {{ city?: string, q?: string, amenityId?: string[] }} query */
  async listPublic(query) {
    const rows = await this.repo.findActivePublic({
      city: query.city,
      q: query.q,
      amenityIds: query.amenityId ?? [],
    });
    const links = await this.repo.findAmenitiesForLocations(rows.map((row) => row.id));

    const amenitiesByLocation = new Map();
    for (const link of links) {
      const list = amenitiesByLocation.get(link.locationId) ?? [];
      list.push(link.amenity);
      amenitiesByLocation.set(link.locationId, list);
    }

    return {
      data: rows.map((row) => toLocationListDto(row, amenitiesByLocation.get(row.id) ?? [])),
    };
  }

  /**
   * @param {string} slug
   * @throws {NotFoundError}
   */
  async getBySlug(slug) {
    const location = await this.repo.findBySlugActive(slug);
    if (!location) throw new NotFoundError("Location not found.");

    const settings = await this.settings.getSettings();
    return toLocationDetailDto(location, settings.currency);
  }
}

export const locationsService = new LocationsService();

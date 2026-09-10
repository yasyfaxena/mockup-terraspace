import { settingsService as defaultSettingsService } from "../settings/index.js";
import { amenitiesService as defaultAmenitiesService } from "../amenities/index.js";
import { NotFoundError, ConflictError, ValidationError } from "../../shared/errors/http-errors.js";
import { LocationsRepository } from "./locations.repository.js";
import { toLocationListDto, toLocationDetailDto, toAdminLocationDto } from "./locations.mapper.js";
import { slugify } from "./locations.slug.js";

export class LocationsService {
  /**
   * @param {{
   *   locationsRepository?: LocationsRepository,
   *   settingsService?: typeof defaultSettingsService,
   *   amenitiesService?: typeof defaultAmenitiesService,
   * }} [deps]
   */
  constructor(deps = {}) {
    this.repo = deps.locationsRepository ?? new LocationsRepository();
    this.settings = deps.settingsService ?? defaultSettingsService;
    this.amenities = deps.amenitiesService ?? defaultAmenitiesService;
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

  /** @param {{ status?: string, q?: string }} query */
  async listAdmin(query) {
    const locations = await this.repo.findAllAdmin(query);
    return { data: locations.map(toAdminLocationDto) };
  }

  /**
   * @param {string} id
   * @throws {NotFoundError}
   */
  async getAdminDetail(id) {
    const location = await this.repo.findByIdAdmin(id);
    if (!location) throw new NotFoundError("Location not found.");
    return toAdminLocationDto(location);
  }

  /**
   * @param {Record<string, any>} data
   * @throws {ValidationError} slug reduces to empty
   * @throws {ConflictError} slug already exists
   */
  async create(data) {
    const slug = slugify(data.slug);
    if (!slug) {
      throw new ValidationError("Slug must contain at least one letter or number.");
    }
    const existing = await this.repo.findBySlug(slug);
    if (existing) throw new ConflictError("A location with this slug already exists.");

    await this.amenities.assertActiveAmenityIds(data.amenityIds);

    const { amenityIds = [], ...fields } = data;
    const location = await this.repo.transaction(async (tx) => {
      const created = await this.repo.create({ ...fields, slug }, tx);
      await this.repo.setAmenities(created.id, amenityIds, tx);
      return created;
    });

    return this.getAdminDetail(location.id);
  }

  /**
   * @param {string} id
   * @param {Record<string, any>} data
   * @throws {NotFoundError}
   * @throws {ValidationError} slug reduces to empty
   * @throws {ConflictError} new slug already exists
   */
  async update(id, data) {
    const location = await this.repo.findById(id);
    if (!location) throw new NotFoundError("Location not found.");

    /** @type {string | undefined} */
    let slug;
    if (data.slug !== undefined) {
      slug = slugify(data.slug);
      if (!slug) {
        throw new ValidationError("Slug must contain at least one letter or number.");
      }
      if (slug !== location.slug) {
        const existing = await this.repo.findBySlug(slug);
        if (existing) throw new ConflictError("A location with this slug already exists.");
      }
    }

    if (data.amenityIds !== undefined) {
      await this.amenities.assertActiveAmenityIds(data.amenityIds);
    }

    const { amenityIds, ...fields } = data;
    await this.repo.transaction(async (tx) => {
      await this.repo.update(id, { ...fields, ...(slug !== undefined ? { slug } : {}) }, tx);
      if (amenityIds !== undefined) {
        await this.repo.replaceAmenities(id, amenityIds, tx);
      }
    });

    return this.getAdminDetail(id);
  }

  /**
   * @param {string} id
   * @throws {NotFoundError}
   * @throws {ConflictError} location still has workspaces
   */
  async remove(id) {
    const location = await this.repo.findById(id);
    if (!location) throw new NotFoundError("Location not found.");

    const workspaceCount = await this.repo.countWorkspaces(id);
    if (workspaceCount > 0) throw new ConflictError("Location still has workspaces.");

    await this.repo.delete(id);
    return { success: true };
  }
}

export const locationsService = new LocationsService();

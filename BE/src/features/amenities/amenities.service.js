import { NotFoundError, ConflictError, ValidationError } from "../../shared/errors/http-errors.js";
import { AmenitiesRepository } from "./amenities.repository.js";
import { toAmenityDto, toAdminAmenityDto } from "./amenities.mapper.js";
import { AmenityInUseError } from "./amenities.errors.js";

export class AmenitiesService {
  /** @param {{ amenitiesRepository?: AmenitiesRepository }} [deps] */
  constructor(deps = {}) {
    this.repo = deps.amenitiesRepository ?? new AmenitiesRepository();
  }

  /** @param {{ category?: string }} query */
  async listPublic(query) {
    const amenities = await this.repo.findActive(query);
    return { data: amenities.map(toAmenityDto) };
  }

  /** @param {{ status?: string, category?: string, q?: string }} query */
  async listAdmin(query) {
    const amenities = await this.repo.findAllAdmin(query);
    return { data: amenities.map(toAdminAmenityDto) };
  }

  /**
   * @param {{ name: string, category?: string, icon?: string, status?: string }} data
   * @throws {ConflictError} `name` already exists
   */
  async create(data) {
    const existing = await this.repo.findByName(data.name);
    if (existing) throw new ConflictError("An amenity with this name already exists.");

    const amenity = await this.repo.create(data);
    return toAdminAmenityDto(amenity);
  }

  /**
   * @param {string} id
   * @param {{ name?: string, category?: string, icon?: string, status?: string }} data
   * @throws {NotFoundError}
   * @throws {ConflictError} new `name` already exists
   */
  async update(id, data) {
    const amenity = await this.repo.findById(id);
    if (!amenity) throw new NotFoundError("Amenity not found.");

    if (data.name && data.name !== amenity.name) {
      const existing = await this.repo.findByName(data.name);
      if (existing) throw new ConflictError("An amenity with this name already exists.");
    }

    await this.repo.update(id, data);
    const updated = await this.repo.findByIdAdmin(id);
    return toAdminAmenityDto(/** @type {NonNullable<typeof updated>} */ (updated));
  }

  /**
   * @param {string} id
   * @throws {NotFoundError}
   * @throws {AmenityInUseError} assigned to any location or workspace
   */
  async remove(id) {
    const amenity = await this.repo.findById(id);
    if (!amenity) throw new NotFoundError("Amenity not found.");

    const usage = await this.repo.countUsage(id);
    if (usage.locations > 0 || usage.workspaces > 0) throw new AmenityInUseError();

    await this.repo.delete(id);
    return { success: true };
  }

  /**
   * Used by locations/workspaces when writing their `amenityIds` field —
   * "each must exist and be active" (locations.md §4, workspaces.md §5).
   * @param {string[] | undefined} amenityIds
   * @throws {ValidationError} an id does not exist or is not active
   */
  async assertActiveAmenityIds(amenityIds) {
    if (!amenityIds || amenityIds.length === 0) return;
    const found = await this.repo.findActiveByIds(amenityIds);
    const foundIds = new Set(found.map((amenity) => amenity.id));
    const missing = amenityIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new ValidationError(`Unknown or inactive amenityIds: ${missing.join(", ")}`);
    }
  }
}

export const amenitiesService = new AmenitiesService();

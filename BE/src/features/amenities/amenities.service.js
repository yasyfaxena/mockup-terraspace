import { AmenitiesRepository } from "./amenities.repository.js";
import { toAmenityDto } from "./amenities.mapper.js";

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
}

export const amenitiesService = new AmenitiesService();

import { apiClient } from "@/lib/api-client";
import { toQueryString } from "@/shared/query-string";
import type { LocationDetailDto, LocationListItemDto } from "./locations.types";

export type ListLocationsParams = { city?: string; q?: string; amenityId?: string[] };

export function listLocations(params: ListLocationsParams = {}) {
  return apiClient.get<{ data: LocationListItemDto[] }>(
    `/api/v1/locations${toQueryString(params)}`,
  );
}

export function getLocationBySlug(slug: string) {
  return apiClient.get<LocationDetailDto>(`/api/v1/locations/${slug}`);
}

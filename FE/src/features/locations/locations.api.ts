import { apiClient } from "@/lib/api-client";
import { toQueryString } from "@/shared/query-string";
import type { AdminLocationDto, LocationDetailDto, LocationListItemDto } from "./locations.types";
import type { LocationFormInput } from "./locations.schema";

export type ListLocationsParams = { city?: string; q?: string; amenityId?: string[] };

export function listLocations(params: ListLocationsParams = {}) {
  return apiClient.get<{ data: LocationListItemDto[] }>(
    `/api/v1/locations${toQueryString(params)}`,
  );
}

export function getLocationBySlug(slug: string) {
  return apiClient.get<LocationDetailDto>(`/api/v1/locations/${slug}`);
}

export type ListAdminLocationsParams = { status?: string; q?: string };

export function listAdminLocations(params: ListAdminLocationsParams = {}) {
  return apiClient.get<{ data: AdminLocationDto[] }>(
    `/api/v1/admin/locations${toQueryString(params)}`,
  );
}

export function createLocation(input: LocationFormInput) {
  return apiClient.post<AdminLocationDto>("/api/v1/admin/locations", input);
}

export function updateLocation(id: string, input: Partial<LocationFormInput>) {
  return apiClient.patch<AdminLocationDto>(`/api/v1/admin/locations/${id}`, input);
}

export function deleteLocation(id: string) {
  return apiClient.delete<{ success: boolean }>(`/api/v1/admin/locations/${id}`);
}

import { apiClient } from "@/lib/api-client";
import { toQueryString } from "@/shared/query-string";
import type { AdminAmenityDto, AmenityDto } from "./amenities.types";
import type { AmenityFormInput } from "./amenities.schema";

export type ListAmenitiesParams = { category?: string };

export function listAmenities(params: ListAmenitiesParams = {}) {
  return apiClient.get<{ data: AmenityDto[] }>(`/api/v1/amenities${toQueryString(params)}`);
}

export type ListAdminAmenitiesParams = { status?: string; category?: string; q?: string };

export function listAdminAmenities(params: ListAdminAmenitiesParams = {}) {
  return apiClient.get<{ data: AdminAmenityDto[] }>(
    `/api/v1/admin/amenities${toQueryString(params)}`,
  );
}

export function createAmenity(input: AmenityFormInput) {
  return apiClient.post<AdminAmenityDto>("/api/v1/admin/amenities", input);
}

export function updateAmenity(id: string, input: Partial<AmenityFormInput>) {
  return apiClient.patch<AdminAmenityDto>(`/api/v1/admin/amenities/${id}`, input);
}

export function deleteAmenity(id: string) {
  return apiClient.delete<{ success: boolean }>(`/api/v1/admin/amenities/${id}`);
}

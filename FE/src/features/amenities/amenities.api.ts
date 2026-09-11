import { apiClient } from "@/lib/api-client";
import { toQueryString } from "@/shared/query-string";
import type { AmenityDto } from "./amenities.types";

export type ListAmenitiesParams = { category?: string };

export function listAmenities(params: ListAmenitiesParams = {}) {
  return apiClient.get<{ data: AmenityDto[] }>(`/api/v1/amenities${toQueryString(params)}`);
}

import { queryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/query-keys";
import { listAmenities, type ListAmenitiesParams } from "./amenities.api";

/** Shared with route `loader`s via `queryClient.ensureQueryData` (fe-architecture.md §8). */
export function amenitiesListQueryOptions(params: ListAmenitiesParams = {}) {
  return queryOptions({
    queryKey: queryKeys.amenities.list(params),
    queryFn: () => listAmenities(params),
  });
}

export function useAmenities(params: ListAmenitiesParams = {}) {
  return useQuery(amenitiesListQueryOptions(params));
}

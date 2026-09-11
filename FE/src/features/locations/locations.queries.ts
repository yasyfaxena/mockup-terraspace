import { queryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/query-keys";
import { getLocationBySlug, listLocations, type ListLocationsParams } from "./locations.api";

/**
 * Shared between the `use*` hooks below and a route's `loader` (via
 * `queryClient.ensureQueryData`) — same query key, same fetcher, so an SSR
 * prefetch and the client hook hit the same cache entry instead of both
 * fetching (fe-architecture.md §8).
 */
export function locationsListQueryOptions(params: ListLocationsParams = {}) {
  return queryOptions({
    queryKey: queryKeys.locations.list(params),
    queryFn: () => listLocations(params),
  });
}

export function locationDetailQueryOptions(slug: string) {
  return queryOptions({
    queryKey: queryKeys.locations.detail(slug),
    queryFn: () => getLocationBySlug(slug),
  });
}

export function useLocations(params: ListLocationsParams = {}) {
  return useQuery(locationsListQueryOptions(params));
}

export function useLocation(slug: string) {
  return useQuery({ ...locationDetailQueryOptions(slug), enabled: Boolean(slug) });
}

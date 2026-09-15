import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/query-keys";
import {
  createLocation,
  deleteLocation,
  getLocationBySlug,
  listAdminLocations,
  listLocations,
  updateLocation,
  type ListAdminLocationsParams,
  type ListLocationsParams,
} from "./locations.api";
import type { LocationFormInput } from "./locations.schema";

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

export function adminLocationsListQueryOptions(params: ListAdminLocationsParams = {}) {
  return queryOptions({
    queryKey: queryKeys.locations.adminList(params),
    queryFn: () => listAdminLocations(params),
  });
}

export function useLocations(params: ListLocationsParams = {}) {
  return useQuery(locationsListQueryOptions(params));
}

export function useLocation(slug: string) {
  return useQuery({ ...locationDetailQueryOptions(slug), enabled: Boolean(slug) });
}

export function useAdminLocations(params: ListAdminLocationsParams = {}) {
  return useQuery(adminLocationsListQueryOptions(params));
}

function useInvalidateLocations() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.locations.all() });
  };
}

export function useCreateLocation() {
  const invalidate = useInvalidateLocations();
  return useMutation({
    mutationFn: (input: LocationFormInput) => createLocation(input),
    onSuccess: invalidate,
  });
}

export function useUpdateLocation() {
  const invalidate = useInvalidateLocations();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<LocationFormInput> }) =>
      updateLocation(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteLocation() {
  const invalidate = useInvalidateLocations();
  return useMutation({
    mutationFn: (id: string) => deleteLocation(id),
    onSuccess: invalidate,
  });
}

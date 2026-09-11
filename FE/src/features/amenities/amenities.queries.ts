import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/query-keys";
import {
  createAmenity,
  deleteAmenity,
  listAdminAmenities,
  listAmenities,
  updateAmenity,
  type ListAdminAmenitiesParams,
  type ListAmenitiesParams,
} from "./amenities.api";
import type { AmenityFormInput } from "./amenities.schema";

/** Shared with route `loader`s via `queryClient.ensureQueryData` (fe-architecture.md §8). */
export function amenitiesListQueryOptions(params: ListAmenitiesParams = {}) {
  return queryOptions({
    queryKey: queryKeys.amenities.list(params),
    queryFn: () => listAmenities(params),
  });
}

export function adminAmenitiesListQueryOptions(params: ListAdminAmenitiesParams = {}) {
  return queryOptions({
    queryKey: queryKeys.amenities.adminList(params),
    queryFn: () => listAdminAmenities(params),
  });
}

export function useAmenities(params: ListAmenitiesParams = {}) {
  return useQuery(amenitiesListQueryOptions(params));
}

export function useAdminAmenities(params: ListAdminAmenitiesParams = {}) {
  return useQuery(adminAmenitiesListQueryOptions(params));
}

function useInvalidateAmenities() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.amenities.all() });
  };
}

export function useCreateAmenity() {
  const invalidate = useInvalidateAmenities();
  return useMutation({
    mutationFn: (input: AmenityFormInput) => createAmenity(input),
    onSuccess: invalidate,
  });
}

export function useUpdateAmenity() {
  const invalidate = useInvalidateAmenities();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AmenityFormInput> }) =>
      updateAmenity(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteAmenity() {
  const invalidate = useInvalidateAmenities();
  return useMutation({
    mutationFn: (id: string) => deleteAmenity(id),
    onSuccess: invalidate,
  });
}

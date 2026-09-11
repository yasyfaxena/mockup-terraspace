import { queryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/query-keys";
import { getPublicSettings } from "./settings.api";

export function publicSettingsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.settings.public(),
    queryFn: () => getPublicSettings(),
    // Rarely changes (admin-configured), and every booking screen reads
    // it — no point refetching on every mount.
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicSettings() {
  return useQuery(publicSettingsQueryOptions());
}

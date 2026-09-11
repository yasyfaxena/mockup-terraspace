import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/query-keys";
import { getAdminSettings, getPublicSettings, updateAdminSettings } from "./settings.api";
import type { UpdateSettingsInput } from "./settings.schema";

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

export function adminSettingsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.settings.admin(),
    queryFn: () => getAdminSettings(),
  });
}

export function useAdminSettings() {
  return useQuery(adminSettingsQueryOptions());
}

export function useUpdateAdminSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSettingsInput) => updateAdminSettings(input),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.settings.admin(), updated);
      // The public settings DTO reflects the same row (currency, tax,
      // cancellation window) — every booking screen's price/cutoff math
      // reads that query, so it must not serve a stale cache after a save.
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.public() });
    },
  });
}

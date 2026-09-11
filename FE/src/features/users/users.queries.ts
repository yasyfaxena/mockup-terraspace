import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/query-keys";
import { getMe, updateMe } from "./users.api";
import type { UpdateProfileInput } from "./users.schema";

export function meQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.users.me(),
    queryFn: () => getMe(),
  });
}

export function useMe() {
  return useQuery(meQueryOptions());
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateMe(input),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.users.me(), updated);
    },
  });
}

import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/shared/query-keys";
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  getWorkspaceAvailability,
  listAdminWorkspaces,
  listWorkspaces,
  updateWorkspace,
  type ListAdminWorkspacesParams,
  type ListWorkspacesParams,
} from "./workspaces.api";
import type { WorkspaceFormInput } from "./workspaces.schema";

/** Shared with route `loader`s via `queryClient.ensureQueryData` (fe-architecture.md §8). */
export function workspacesListQueryOptions(params: ListWorkspacesParams = {}) {
  return queryOptions({
    queryKey: queryKeys.workspaces.list(params),
    queryFn: () => listWorkspaces(params),
  });
}

export function workspaceDetailQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.workspaces.detail(id),
    queryFn: () => getWorkspace(id),
  });
}

export function workspaceAvailabilityQueryOptions(id: string, date: string) {
  return queryOptions({
    queryKey: queryKeys.workspaces.availability(id, date),
    queryFn: () => getWorkspaceAvailability(id, date),
  });
}

export function adminWorkspacesListQueryOptions(params: ListAdminWorkspacesParams = {}) {
  return queryOptions({
    queryKey: queryKeys.workspaces.adminList(params),
    queryFn: () => listAdminWorkspaces(params),
  });
}

export function useWorkspaces(params: ListWorkspacesParams = {}) {
  return useQuery({
    ...workspacesListQueryOptions(params),
    placeholderData: keepPreviousData,
  });
}

export function useWorkspace(id: string) {
  return useQuery({ ...workspaceDetailQueryOptions(id), enabled: Boolean(id) });
}

export function useWorkspaceAvailability(id: string, date: string) {
  return useQuery({
    ...workspaceAvailabilityQueryOptions(id, date),
    enabled: Boolean(id) && Boolean(date),
    placeholderData: keepPreviousData,
  });
}

export function useAdminWorkspaces(params: ListAdminWorkspacesParams = {}) {
  return useQuery({
    ...adminWorkspacesListQueryOptions(params),
    placeholderData: keepPreviousData,
  });
}

function useInvalidateWorkspaces() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all() });
  };
}

export function useCreateWorkspace() {
  const invalidate = useInvalidateWorkspaces();
  return useMutation({
    mutationFn: (input: WorkspaceFormInput) => createWorkspace(input),
    onSuccess: invalidate,
  });
}

export function useUpdateWorkspace() {
  const invalidate = useInvalidateWorkspaces();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<WorkspaceFormInput> }) =>
      updateWorkspace(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteWorkspace() {
  const invalidate = useInvalidateWorkspaces();
  return useMutation({
    mutationFn: (id: string) => deleteWorkspace(id),
    onSuccess: invalidate,
  });
}

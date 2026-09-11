import { queryOptions, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/query-keys";
import {
  getWorkspace,
  getWorkspaceAvailability,
  listWorkspaces,
  type ListWorkspacesParams,
} from "./workspaces.api";

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

export function useWorkspaces(params: ListWorkspacesParams = {}) {
  return useQuery(workspacesListQueryOptions(params));
}

export function useWorkspace(id: string) {
  return useQuery({ ...workspaceDetailQueryOptions(id), enabled: Boolean(id) });
}

export function useWorkspaceAvailability(id: string, date: string) {
  return useQuery({
    ...workspaceAvailabilityQueryOptions(id, date),
    enabled: Boolean(id) && Boolean(date),
  });
}

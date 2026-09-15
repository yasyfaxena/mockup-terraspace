import { apiClient } from "@/lib/api-client";
import { toQueryString } from "@/shared/query-string";
import type {
  AdminWorkspaceDto,
  WorkspaceAvailabilityDto,
  WorkspaceDetailDto,
  WorkspaceListItemDto,
  WorkspaceType,
} from "./workspaces.types";
import type { WorkspaceFormInput } from "./workspaces.schema";

type PaginationMeta = { page: number; limit: number; total: number; totalPages: number };

export type ListWorkspacesParams = {
  page?: number | undefined;
  limit?: number | undefined;
  locationId?: string | undefined;
  locationSlug?: string | undefined;
  type?: WorkspaceType[] | undefined;
  availability?: string[] | undefined;
  amenityId?: string[] | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  sort?: "pricePerHour" | "name" | "createdAt" | undefined;
  order?: "asc" | "desc" | undefined;
};

export function listWorkspaces(params: ListWorkspacesParams = {}) {
  return apiClient.get<{ data: WorkspaceListItemDto[]; meta: PaginationMeta }>(
    `/api/v1/workspaces${toQueryString(params)}`,
  );
}

export function getWorkspace(id: string) {
  return apiClient.get<WorkspaceDetailDto>(`/api/v1/workspaces/${id}`);
}

export function getWorkspaceAvailability(id: string, date: string) {
  return apiClient.get<WorkspaceAvailabilityDto>(
    `/api/v1/workspaces/${id}/availability${toQueryString({ date })}`,
  );
}

export type ListAdminWorkspacesParams = {
  page?: number | undefined;
  limit?: number | undefined;
  locationId?: string | undefined;
  type?: WorkspaceType[] | undefined;
  availability?: string[] | undefined;
  amenityId?: string[] | undefined;
  q?: string | undefined;
};

export function listAdminWorkspaces(params: ListAdminWorkspacesParams = {}) {
  return apiClient.get<{ data: AdminWorkspaceDto[]; meta: PaginationMeta }>(
    `/api/v1/admin/workspaces${toQueryString(params)}`,
  );
}

export function createWorkspace(input: WorkspaceFormInput) {
  return apiClient.post<AdminWorkspaceDto>("/api/v1/admin/workspaces", input);
}

export function updateWorkspace(id: string, input: Partial<WorkspaceFormInput>) {
  return apiClient.patch<AdminWorkspaceDto>(`/api/v1/admin/workspaces/${id}`, input);
}

export function deleteWorkspace(id: string) {
  return apiClient.delete<{ success: boolean }>(`/api/v1/admin/workspaces/${id}`);
}

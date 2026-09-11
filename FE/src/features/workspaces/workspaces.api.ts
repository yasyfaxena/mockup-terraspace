import { apiClient } from "@/lib/api-client";
import { toQueryString } from "@/shared/query-string";
import type {
  WorkspaceAvailabilityDto,
  WorkspaceDetailDto,
  WorkspaceListItemDto,
  WorkspaceType,
} from "./workspaces.types";

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

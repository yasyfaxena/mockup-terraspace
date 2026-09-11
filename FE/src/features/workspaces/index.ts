export {
  useWorkspaces,
  useWorkspace,
  useWorkspaceAvailability,
  useAdminWorkspaces,
  useCreateWorkspace,
  useUpdateWorkspace,
  useDeleteWorkspace,
  workspacesListQueryOptions,
  workspaceDetailQueryOptions,
  adminWorkspacesListQueryOptions,
} from "./workspaces.queries";
export { WorkspaceCard } from "./components/workspace-card";
export { AvailabilityBadge } from "./components/availability-badge";
export { SearchModule } from "./components/search-module";
export { AvailabilityCalendar } from "./components/availability-calendar";
export { AdminWorkspaceTable } from "./components/admin-workspace-table";
export { AdminWorkspaceForm } from "./components/admin-workspace-form";
export type {
  WorkspaceType,
  WorkspaceAvailability,
  WorkspaceListItemDto,
  WorkspaceDetailDto,
  WorkspaceAvailabilityDto,
  AdminWorkspaceDto,
} from "./workspaces.types";
export type { ListWorkspacesParams, ListAdminWorkspacesParams } from "./workspaces.api";
export type { WorkspaceFormInput } from "./workspaces.schema";

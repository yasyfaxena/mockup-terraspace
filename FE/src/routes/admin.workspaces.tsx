import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AdminWorkspaceForm,
  AdminWorkspaceTable,
  adminWorkspacesListQueryOptions,
  useAdminWorkspaces,
  type AdminWorkspaceDto,
} from "@/features/workspaces";

export const Route = createFileRoute("/admin/workspaces")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(adminWorkspacesListQueryOptions()),
  component: AdminWorkspacesPage,
});

function AdminWorkspacesPage() {
  const { data, isPending } = useAdminWorkspaces();
  const workspaces = data?.data ?? [];
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminWorkspaceDto | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-white/35">Manage workspaces from the live V2 API.</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="size-3.5" /> Add Workspace
        </Button>
      </div>

      {isPending ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : (
        <AdminWorkspaceTable
          workspaces={workspaces}
          onEdit={(workspace) => {
            setEditing(workspace);
            setFormOpen(true);
          }}
        />
      )}

      <AdminWorkspaceForm open={formOpen} onOpenChange={setFormOpen} workspace={editing} />
    </div>
  );
}

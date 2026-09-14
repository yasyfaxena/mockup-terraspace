import { Building2, Edit3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/shared/format";
import { useDeleteWorkspace } from "../workspaces.queries";
import type { AdminWorkspaceDto } from "../workspaces.types";
import { AvailabilityBadge } from "./availability-badge";

export function AdminWorkspaceTable({
  workspaces,
  onEdit,
}: {
  workspaces: AdminWorkspaceDto[];
  onEdit: (workspace: AdminWorkspaceDto) => void;
}) {
  const deleteWorkspace = useDeleteWorkspace();

  async function handleDelete(workspace: AdminWorkspaceDto) {
    if (workspace.activeBookingCount > 0) {
      if (
        !confirm(
          `${workspace.name} has ${workspace.activeBookingCount} active booking(s). Delete anyway?`,
        )
      )
        return;
    } else if (!confirm(`Delete this workspace? (${workspace.name})`)) {
      return;
    }
    try {
      await deleteWorkspace.mutateAsync(workspace.id);
      toast.success(`Workspace deleted — ${workspace.name}`);
    } catch {
      // query-client's global handler already toasts the real ApiError message
    }
  }

  if (workspaces.length === 0) {
    return <p className="py-8 text-center text-sm text-white/60">No workspaces yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[.07] bg-[#09101f]/40">
      {workspaces.map((workspace) => (
        <div
          key={workspace.id}
          className="flex items-center gap-4 border-b border-white/[.06] px-5 py-4 last:border-b-0 hover:bg-white/[.02] transition-colors"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{workspace.name}</p>
            <p className="truncate text-xs text-white/65">
              {workspace.location.name} · {workspace.type} · {formatMoney(workspace.pricePerHour)}
              /hr
            </p>
          </div>
          <AvailabilityBadge status={workspace.availability} />
          <button
            onClick={() => onEdit(workspace)}
            className="p-2 text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Edit workspace"
          >
            <Edit3 className="size-3.5" />
          </button>
          <button
            onClick={() => void handleDelete(workspace)}
            className="p-2 text-white/50 hover:text-red-400 transition-colors cursor-pointer"
            title="Delete workspace"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

import { CheckCircle2, Edit3, MapPin, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useDeleteLocation } from "../locations.queries";
import type { AdminLocationDto } from "../locations.types";

export function AdminLocationTable({
  locations,
  onEdit,
}: {
  locations: AdminLocationDto[];
  onEdit: (location: AdminLocationDto) => void;
}) {
  const deleteLocation = useDeleteLocation();

  async function handleDelete(location: AdminLocationDto) {
    if (!confirm(`Delete this location? (${location.name})`)) return;
    try {
      await deleteLocation.mutateAsync(location.id);
      toast.success(`Location deleted — ${location.name}`);
    } catch {
      // 409 "Location still has workspaces." (or any other ApiError) is
      // already shown by the query-client's global handler — real message,
      // not a generic failure toast.
    }
  }

  if (locations.length === 0) {
    return <p className="py-8 text-center text-sm text-white/40">No locations yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[.07]">
      {locations.map((location) => (
        <div
          key={location.id}
          className="flex items-center gap-4 border-b border-white/[.04] px-5 py-4 last:border-b-0"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <MapPin className="size-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{location.name}</p>
            <p className="truncate text-xs text-white/30">
              {location.address}, {location.city} · {location.workspaceCount} workspace
              {location.workspaceCount === 1 ? "" : "s"}
            </p>
          </div>
          {location.status === "active" ? (
            <CheckCircle2 className="size-4 text-emerald-400" />
          ) : (
            <XCircle className="size-4 text-white/30" />
          )}
          <button onClick={() => onEdit(location)} className="p-2 text-white/35 hover:text-white">
            <Edit3 className="size-3.5" />
          </button>
          <button
            onClick={() => void handleDelete(location)}
            className="p-2 text-white/30 hover:text-red-400"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

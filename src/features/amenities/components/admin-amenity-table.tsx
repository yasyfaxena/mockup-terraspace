import { Edit3, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDeleteAmenity } from "../amenities.queries";
import type { AdminAmenityDto } from "../amenities.types";

/**
 * V1's flat list shape is fine to keep here — this isn't the sortable/
 * filterable kind of table `components/ui/data-table.tsx` exists for
 * (features/amenities.md §2).
 */
export function AdminAmenityTable({
  amenities,
  onEdit,
}: {
  amenities: AdminAmenityDto[];
  onEdit: (amenity: AdminAmenityDto) => void;
}) {
  const deleteAmenity = useDeleteAmenity();

  async function handleDelete(amenity: AdminAmenityDto) {
    if (!confirm(`Delete this amenity? (${amenity.name})`)) return;
    try {
      await deleteAmenity.mutateAsync(amenity.id);
      toast.success(`Amenity deleted — ${amenity.name}`);
    } catch {
      // query-client's global handler already toasts the real ApiError message
    }
  }

  if (amenities.length === 0) {
    return <p className="py-8 text-center text-sm text-white/40">No amenities yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[.07]">
      {amenities.map((amenity) => (
        <div
          key={amenity.id}
          className="flex items-center gap-4 border-b border-white/[.04] px-5 py-4 last:border-b-0"
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-white/5">
            <Tag className="size-3.5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{amenity.name}</p>
            <p className="text-[10px] text-white/30">
              {amenity.category} · {amenity.status} · used by {amenity.usage.locations} location
              {amenity.usage.locations === 1 ? "" : "s"}, {amenity.usage.workspaces} workspace
              {amenity.usage.workspaces === 1 ? "" : "s"}
            </p>
          </div>
          <button onClick={() => onEdit(amenity)} className="p-2 text-white/35 hover:text-white">
            <Edit3 className="size-3.5" />
          </button>
          <button
            onClick={() => void handleDelete(amenity)}
            className="p-2 text-white/30 hover:text-red-400"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

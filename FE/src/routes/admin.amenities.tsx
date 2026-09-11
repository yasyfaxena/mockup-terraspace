import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AdminAmenityForm,
  AdminAmenityTable,
  adminAmenitiesListQueryOptions,
  useAdminAmenities,
  type AdminAmenityDto,
} from "@/features/amenities";

export const Route = createFileRoute("/admin/amenities")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(adminAmenitiesListQueryOptions()),
  component: AdminAmenitiesPage,
});

function AdminAmenitiesPage() {
  const { data, isPending } = useAdminAmenities();
  const amenities = data?.data ?? [];
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAmenityDto | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-white/35">Manage amenities from the live V2 API.</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="size-3.5" /> Add Amenity
        </Button>
      </div>

      {isPending ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : (
        <AdminAmenityTable
          amenities={amenities}
          onEdit={(amenity) => {
            setEditing(amenity);
            setFormOpen(true);
          }}
        />
      )}

      <AdminAmenityForm open={formOpen} onOpenChange={setFormOpen} amenity={editing} />
    </div>
  );
}

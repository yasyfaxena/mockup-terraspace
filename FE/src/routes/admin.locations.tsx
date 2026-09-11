import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AdminLocationForm,
  AdminLocationTable,
  adminLocationsListQueryOptions,
  useAdminLocations,
  type AdminLocationDto,
} from "@/features/locations";

export const Route = createFileRoute("/admin/locations")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(adminLocationsListQueryOptions()),
  component: AdminLocationsPage,
});

function AdminLocationsPage() {
  const { data, isPending } = useAdminLocations();
  const locations = data?.data ?? [];
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminLocationDto | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-white/35">Manage locations from the live V2 API.</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="size-3.5" /> Add Location
        </Button>
      </div>

      {isPending ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : (
        <AdminLocationTable
          locations={locations}
          onEdit={(location) => {
            setEditing(location);
            setFormOpen(true);
          }}
        />
      )}

      <AdminLocationForm open={formOpen} onOpenChange={setFormOpen} location={editing} />
    </div>
  );
}

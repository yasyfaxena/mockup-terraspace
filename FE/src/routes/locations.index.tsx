import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";

export const Route = createFileRoute("/locations/")({
  component: LocationsPage,
});

function LocationsPage() {
  return (
    <SiteShell>
      <PageHeader title="Locations" description="Catalog browsing lands in Phase 3." />
    </SiteShell>
  );
}

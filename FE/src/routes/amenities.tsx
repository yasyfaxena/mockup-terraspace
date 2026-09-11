import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";

export const Route = createFileRoute("/amenities")({
  component: AmenitiesPage,
});

function AmenitiesPage() {
  return (
    <SiteShell>
      <PageHeader title="Amenities" description="Catalog browsing lands in Phase 3." />
    </SiteShell>
  );
}

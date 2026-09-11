import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <SiteShell>
      <PageHeader title="My Account" description="Bookings and access lands in Phase 5." />
    </SiteShell>
  );
}

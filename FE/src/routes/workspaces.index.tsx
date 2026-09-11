import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";

export const Route = createFileRoute("/workspaces/")({
  component: WorkspacesPage,
});

function WorkspacesPage() {
  return (
    <SiteShell>
      <PageHeader title="Workspaces" description="Catalog browsing lands in Phase 3." />
    </SiteShell>
  );
}

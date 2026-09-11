import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";
import { requireAuth } from "@/features/auth";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => requireAuth(),
  component: DashboardPage,
});

function DashboardPage() {
  // Reads beforeLoad's already-resolved session from route context instead
  // of calling useSession() again — avoids an SSR flash where the client
  // hook hasn't fetched yet and the name would briefly render blank.
  const { user } = Route.useRouteContext();

  return (
    <SiteShell>
      <PageHeader
        title="My Account"
        description={`Signed in as ${user.name}. Bookings and access land in Phase 5.`}
      />
    </SiteShell>
  );
}

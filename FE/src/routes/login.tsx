import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  return (
    <SiteShell>
      <PageHeader title="Sign in" description="Better Auth wiring lands in Phase 2." />
    </SiteShell>
  );
}

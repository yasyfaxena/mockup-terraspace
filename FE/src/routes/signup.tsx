import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  return (
    <SiteShell>
      <PageHeader title="Sign up" description="Better Auth wiring lands in Phase 2." />
    </SiteShell>
  );
}

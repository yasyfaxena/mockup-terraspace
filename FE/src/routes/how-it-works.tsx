import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";

export const Route = createFileRoute("/how-it-works")({
  component: HowItWorksPage,
});

// Static/marketing page — no feature owns this route (frontend-spec.md §4).
// V1's real copy (src/routes/how-it-works.tsx) is not yet ported; this is a
// placeholder so header/footer links resolve, not the final content.
function HowItWorksPage() {
  return (
    <SiteShell>
      <PageHeader title="How It Works" description="Static content — not yet ported from V1." />
    </SiteShell>
  );
}

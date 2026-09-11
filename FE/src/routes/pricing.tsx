import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

// Static/marketing page — no feature owns this route (frontend-spec.md §4).
// V1's real copy (src/routes/pricing.tsx) is not yet ported; this is a
// placeholder so header/footer links resolve, not the final content.
function PricingPage() {
  return (
    <SiteShell>
      <PageHeader title="Pricing" description="Static content — not yet ported from V1." />
    </SiteShell>
  );
}

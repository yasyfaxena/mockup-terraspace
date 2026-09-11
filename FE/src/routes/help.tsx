import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";

export const Route = createFileRoute("/help")({
  component: HelpPage,
});

// Static/marketing page — no feature owns this route (frontend-spec.md §4).
// V1's real copy (src/routes/help.tsx) is not yet ported; this is a
// placeholder so header/footer links resolve, not the final content.
function HelpPage() {
  return (
    <SiteShell>
      <PageHeader title="Help Center" description="Static content — not yet ported from V1." />
    </SiteShell>
  );
}

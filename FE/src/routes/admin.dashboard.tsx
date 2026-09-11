import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/dashboard")({
  component: () => (
    <p className="text-sm text-white/60">Overview cards and activity feed land in Phase 7.</p>
  ),
});

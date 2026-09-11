import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/analytics")({
  component: () => (
    <p className="text-sm text-white/60">Revenue/occupancy charts land in Phase 7.</p>
  ),
});

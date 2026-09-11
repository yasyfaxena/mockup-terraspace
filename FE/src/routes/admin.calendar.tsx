import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/calendar")({
  component: () => (
    <p className="text-sm text-white/60">The operations calendar view lands in Phase 5.</p>
  ),
});

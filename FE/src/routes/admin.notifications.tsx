import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/notifications")({
  component: () => (
    <p className="text-sm text-white/60">
      Folds into the single activity feed in Phase 7 (reports.md §2) — not a separate panel.
    </p>
  ),
});

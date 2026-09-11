import { createFileRoute, redirect } from "@tanstack/react-router";

// Folds into the one activity feed on the dashboard (development-phases.md
// Phase 7, reports.md §2) — not a separate panel with its own unread-count
// badge and auto-mark-read-on-mount behavior like V1's admin-notifications.
// Kept as a route (rather than deleted) so an old bookmark/link still lands
// somewhere real.
export const Route = createFileRoute("/admin/notifications")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/dashboard" });
  },
});

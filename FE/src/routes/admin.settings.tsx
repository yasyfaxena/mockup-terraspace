import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/settings")({
  component: () => <p className="text-sm text-white/60">Admin settings form lands in Phase 7.</p>,
});

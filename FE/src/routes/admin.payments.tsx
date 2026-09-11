import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/payments")({
  component: () => <p className="text-sm text-white/60">Payment management lands in Phase 6.</p>,
});

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/bookings")({
  component: () => <p className="text-sm text-white/60">Booking management lands in Phase 5.</p>,
});

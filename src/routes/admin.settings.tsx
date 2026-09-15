import { createFileRoute } from "@tanstack/react-router";
import { AdminSettingsForm, adminSettingsQueryOptions } from "@/features/settings";

export const Route = createFileRoute("/admin/settings")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(adminSettingsQueryOptions()),
  component: () => (
    <div className="space-y-5">
      <p className="text-xs text-white/35">
        Platform-wide values — these move money (tax, cancellation, currency).
      </p>
      <AdminSettingsForm />
    </div>
  ),
});

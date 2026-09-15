import { createFileRoute } from "@tanstack/react-router";

// features/users' admin table (fe-architecture.md §4) has no FE phase
// assigned yet in development-phases.md's phase map — left open, not
// silently dropped.
export const Route = createFileRoute("/admin/members")({
  component: () => (
    <p className="text-sm text-white/60">
      Member management is not yet scheduled in the phase plan.
    </p>
  ),
});

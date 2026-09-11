import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminShell } from "@/components/layout/admin-shell";
import { requireRole } from "@/features/auth";

// Layout route: real per-page admin routes (admin.locations.tsx, ...) nest
// under this one and render into its <Outlet/> (development-phases.md
// decision #6). beforeLoad here guards every nested /admin/* route too —
// TanStack Router runs a parent's beforeLoad before any child's.
export const Route = createFileRoute("/admin")({
  beforeLoad: () => requireRole("admin"),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}

import { createFileRoute, Outlet, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { requireRole } from "@/features/auth";
import { captureError } from "@/lib/error-capture";

// Layout route: real per-page admin routes (admin.locations.tsx, ...) nest
// under this one and render into its <Outlet/> (development-phases.md
// decision #6). beforeLoad here guards every nested /admin/* route too —
// TanStack Router runs a parent's beforeLoad before any child's.
export const Route = createFileRoute("/admin")({
  beforeLoad: () => requireRole("admin"),
  component: AdminLayout,
  // The admin route group's own boundary (development-phases.md Phase 8) —
  // a child route's render/loader error lands here instead of the site's
  // public-facing one, still inside AdminShell so the sidebar/nav survive.
  errorComponent: AdminErrorBoundary,
});

function AdminLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}

function AdminErrorBoundary({ error, info, reset }: ErrorComponentProps) {
  useEffect(() => {
    captureError(error, info);
  }, [error, info]);

  return (
    <AdminShell>
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-6"
      >
        <h1 className="text-base font-bold text-white">This page hit an unexpected error</h1>
        <p className="text-sm text-white/60">Try again, or use the sidebar to go somewhere else.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/15"
        >
          Try again
        </button>
      </div>
    </AdminShell>
  );
}

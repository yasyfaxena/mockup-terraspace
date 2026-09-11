import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import type { AdminTab } from "@/components/layout/admin-sidebar";
import { requireRole } from "@/features/auth";

// Phase 2 proof that requireRole("admin") actually gates this route — real
// per-page admin routes (admin.dashboard.tsx, admin.bookings.tsx, ...)
// replacing this single-route/activeTab shell are Phase 4 (decision #6).
export const Route = createFileRoute("/admin")({
  beforeLoad: () => requireRole("admin"),
  component: AdminPage,
});

function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

  return (
    <AdminShell activeTab={activeTab} onTabChange={setActiveTab}>
      <p className="text-sm text-white/60">Catalog CRUD lands in Phase 4.</p>
    </AdminShell>
  );
}

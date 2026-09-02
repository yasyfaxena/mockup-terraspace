import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AdminLayout, type AdminTab } from "@/frontend/admin/admin-layout";
import { AdminDashboard } from "@/frontend/admin/admin-dashboard";
import { AdminBookings } from "@/frontend/admin/admin-bookings";
import { AdminCalendar } from "@/frontend/admin/admin-calendar";
import { AdminLocations } from "@/frontend/admin/admin-locations";
import { AdminSpaces } from "@/frontend/admin/admin-workspaces";
import { AdminMembers } from "@/frontend/admin/admin-clients";
import { AdminGuests } from "@/frontend/admin/admin-guests";
import { AdminAmenities } from "@/frontend/admin/admin-amenities";
import { AdminPayments } from "@/frontend/admin/admin-payments";
import { AdminAnalytics } from "@/frontend/admin/admin-analytics";
import { AdminNotifications } from "@/frontend/admin/admin-notifications";
import { AdminSettings } from "@/frontend/admin/admin-settings";
import {
  AdminNotificationsProvider,
  AdminThemeProvider,
  useAdminNotifications,
  useAdminTheme,
} from "@/lib/admin-notifications";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Admin — TerraSpace" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { session, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

  useEffect(() => {
    console.log("[ADMIN DEBUG] /admin state:", {
      loading,
      authSession: session ? { userId: session.user.id, email: session.user.email } : null,
      profile: profile
        ? { id: profile.id, role: profile.role, full_name: profile.full_name }
        : null,
      isAdmin,
    });
    if (loading) return;
    if (!session || !isAdmin) {
      console.warn("[ADMIN DEBUG] ACCESS DENIED", {
        sessionExists: Boolean(session),
        userId: session?.user?.id,
        email: session?.user?.email,
        isAdmin,
      });
      navigate({ to: "/admin/login", replace: true });
    }
  }, [loading, session, profile?.role, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
      </div>
    );
  }

  if (!session || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-sm text-white/50">Admin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <AdminThemeProvider>
      <AdminNotificationsProvider>
        <AdminShell activeTab={activeTab} setActiveTab={setActiveTab} />
      </AdminNotificationsProvider>
    </AdminThemeProvider>
  );
}

function AdminShell({
  activeTab,
  setActiveTab,
}: {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
}) {
  const { unreadCount } = useAdminNotifications();
  const { mode, toggle } = useAdminTheme();

  return (
    <AdminLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      notifCount={unreadCount}
      themeMode={mode}
      onToggleTheme={toggle}
    >
      {activeTab === "dashboard" && <AdminDashboard onNavigate={setActiveTab} />}
      {activeTab === "bookings" && <AdminBookings />}
      {activeTab === "calendar" && <AdminCalendar />}
      {activeTab === "locations" && <AdminLocations />}
      {activeTab === "spaces" && <AdminSpaces />}
      {activeTab === "members" && <AdminMembers />}
      {activeTab === "guests" && <AdminGuests />}
      {activeTab === "payments" && <AdminPayments />}
      {activeTab === "amenities" && <AdminAmenities />}
      {activeTab === "analytics" && <AdminAnalytics />}
      {activeTab === "notifications" && <AdminNotifications />}
      {activeTab === "settings" && <AdminSettings />}
    </AdminLayout>
  );
}

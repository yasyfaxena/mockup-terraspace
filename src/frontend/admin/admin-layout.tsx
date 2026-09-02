import { useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  MapPin,
  Building2,
  Users,
  CreditCard,
  Star,
  Wifi,
  BarChart3,
  Bell,
  Settings,
  ExternalLink,
  Menu,
  X,
  Zap,
  LogOut,
  ChevronRight,
  CalendarRange,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import logoIcon from "@/assets/logo-icon.png";

export type AdminTab =
  | "dashboard"
  | "bookings"
  | "calendar"
  | "locations"
  | "spaces"
  | "members"
  | "guests"
  | "payments"
  | "amenities"
  | "analytics"
  | "notifications"
  | "settings";

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface NavItem {
  id: AdminTab | "terraspace";
  icon: React.FC<{ className?: string }>;
  label: string;
  external?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { id: "bookings", icon: CalendarDays, label: "Bookings" },
      { id: "calendar", icon: CalendarRange, label: "Calendar" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { id: "locations", icon: MapPin, label: "Locations" },
      { id: "spaces", icon: Building2, label: "Spaces" },
      { id: "amenities", icon: Wifi, label: "Amenities" },
    ],
  },
  {
    label: "Customers",
    items: [
      { id: "members", icon: Users, label: "Members" },
      { id: "guests", icon: Star, label: "Guests" },
    ],
  },
  {
    label: "Finance",
    items: [{ id: "payments", icon: CreditCard, label: "Payments" }],
  },
  {
    label: "Insights",
    items: [
      { id: "analytics", icon: BarChart3, label: "Analytics" },
      { id: "notifications", icon: Bell, label: "Notifications" },
      { id: "settings", icon: Settings, label: "Settings" },
    ],
  },
];

interface AdminLayoutProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  children: React.ReactNode;
  notifCount?: number;
  themeMode?: "dark" | "light";
  onToggleTheme?: () => void;
}

function SidebarContent({
  activeTab,
  onTabChange,
  notifCount,
  onClose,
}: {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  notifCount: number;
  onClose?: () => void;
}) {
  const { signOut, user, profile } = useAuth();

  return (
    <>
      {/* Logo */}
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
            <img src={logoIcon} alt="TerraSpace" className="w-5 h-5 object-contain" />
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-tight leading-none">TerraSpace</p>
            <p className="text-[9px] text-white/35 font-medium uppercase tracking-widest leading-none mt-0.5">
              Admin Panel
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-white/30 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2 mb-1 text-[9px] font-bold uppercase tracking-widest text-white/20">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id as AdminTab);
                      onClose?.();
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group relative",
                      active
                        ? "bg-gradient-to-r from-[#6366f1]/20 to-[#0ea5e9]/10 text-white border border-[#6366f1]/25"
                        : "text-white/45 hover:text-white hover:bg-white/[0.05]",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-3.5 h-3.5 shrink-0",
                        active ? "text-[#818cf8]" : "text-white/30 group-hover:text-white/60",
                      )}
                    />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.id === "notifications" && notifCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-[#6366f1] text-[9px] font-bold text-white flex items-center justify-center shrink-0">
                        {notifCount > 9 ? "9+" : notifCount}
                      </span>
                    )}
                    {active && <ChevronRight className="w-3 h-3 text-[#818cf8]" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Sattabi external link */}
        <div>
          <p className="px-2 mb-1 text-[9px] font-bold uppercase tracking-widest text-white/20">
            Access
          </p>
          <a
            href="https://sattabi.com/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-white/45 hover:text-white hover:bg-white/[0.05] transition-all group"
          >
            <Zap className="w-3.5 h-3.5 shrink-0 text-white/30 group-hover:text-[#818cf8] transition-colors" />
            <span className="flex-1 text-left">Sattabi</span>
            <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors" />
          </a>
        </div>
      </nav>

      {/* IoT Status + User */}
      <div className="px-2.5 pb-4 space-y-2 shrink-0 border-t border-white/[0.05] pt-3">
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-emerald-500/8 border border-emerald-500/15">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-[11px] text-emerald-400/80 font-medium">IoT Locks · Live</span>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.03]">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#6366f1] to-[#0ea5e9] flex items-center justify-center text-[10px] font-bold shrink-0">
            {user?.email?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-white truncate">
              {user?.email ?? "Admin"}
            </p>
            <p className="text-[9px] text-white/30 capitalize">{profile?.role ?? "admin"}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="p-1 text-white/25 hover:text-red-400 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}

export function AdminLayout({
  activeTab,
  onTabChange,
  children,
  notifCount = 0,
  themeMode = "dark",
  onToggleTheme,
}: AdminLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const pageLabel =
    NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === activeTab)?.label ?? "Admin";
  const isLight = themeMode === "light";

  return (
    <div data-admin-theme={themeMode} className="min-h-screen bg-[#070b14] text-white flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-60 border-r border-white/[0.06] bg-[#09101f]/90 backdrop-blur-xl shrink-0 h-screen sticky top-0">
        <SidebarContent activeTab={activeTab} onTabChange={onTabChange} notifCount={notifCount} />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-60 bg-[#09101f] border-r border-white/[0.08] flex flex-col h-full">
            <SidebarContent
              activeTab={activeTab}
              onTabChange={onTabChange}
              notifCount={notifCount}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Bar */}
        <header className="h-13 shrink-0 border-b border-white/[0.06] bg-[#09101f]/60 backdrop-blur-xl flex items-center px-4 lg:px-5 gap-3 sticky top-0 z-30">
          <button
            className="lg:hidden p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-4.5 h-4.5" />
          </button>
          <h1 className="text-sm font-bold text-white flex-1">{pageLabel}</h1>
          <div className="flex items-center gap-2">
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                title={isLight ? "Switch to dark mode" : "Switch to light mode"}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-medium text-white/50 hover:text-white transition-all"
              >
                {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{isLight ? "Dark" : "Light"}</span>
              </button>
            )}
            <a
              href="/"
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-medium text-white/50 hover:text-white transition-all"
            >
              <ExternalLink className="w-3 h-3" />
              Client Site
            </a>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

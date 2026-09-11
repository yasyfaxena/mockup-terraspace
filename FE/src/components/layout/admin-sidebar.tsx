import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarDays,
  MapPin,
  Building2,
  Users,
  CreditCard,
  Wifi,
  BarChart3,
  Bell,
  Settings,
  ExternalLink,
  X,
  Zap,
  LogOut,
  CalendarRange,
} from "lucide-react";
import { useSession } from "@/features/auth";
import { authClient } from "@/lib/auth-client";
import logoIcon from "@/assets/logo-icon.png";

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface NavItem {
  href: string;
  icon: React.FC<{ className?: string }>;
  label: string;
}

// "Spaces" is the nav label for the workspaces feature; "Members" maps to
// features/users (not yet built). "Guests" is dropped — out of scope for V2
// (README.md's scope decisions).
export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/admin/bookings", icon: CalendarDays, label: "Bookings" },
      { href: "/admin/calendar", icon: CalendarRange, label: "Calendar" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { href: "/admin/locations", icon: MapPin, label: "Locations" },
      { href: "/admin/workspaces", icon: Building2, label: "Spaces" },
      { href: "/admin/amenities", icon: Wifi, label: "Amenities" },
    ],
  },
  {
    label: "Customers",
    items: [{ href: "/admin/members", icon: Users, label: "Members" }],
  },
  {
    label: "Finance",
    items: [{ href: "/admin/payments", icon: CreditCard, label: "Payments" }],
  },
  {
    label: "Insights",
    items: [
      { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
      { href: "/admin/notifications", icon: Bell, label: "Notifications" },
      { href: "/admin/settings", icon: Settings, label: "Settings" },
    ],
  },
];

/**
 * Real per-page routes, not V1's activeTab prop (development-phases.md
 * decision #6) — active state comes from TanStack Router's own `activeProps`
 * matching, so deep links and the browser back/forward button work natively.
 */
export function AdminSidebar({
  notifCount = 0,
  onClose,
}: {
  notifCount?: number;
  onClose?: () => void;
}) {
  const { data } = useSession();
  const user = data?.user;

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
        {ADMIN_NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-2 mb-1 text-[9px] font-bold uppercase tracking-widest text-white/20">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => onClose?.()}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-white/45 transition-all duration-150 hover:bg-white/[0.05] hover:text-white"
                  activeProps={{
                    className:
                      "!text-white !bg-gradient-to-r !from-[#6366f1]/20 !to-[#0ea5e9]/10 !border !border-[#6366f1]/25",
                  }}
                >
                  <item.icon className="size-3.5 shrink-0 text-white/30 group-hover:text-white/60" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.label === "Notifications" && notifCount > 0 && (
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#6366f1] text-[9px] font-bold text-white">
                      {notifCount > 9 ? "9+" : notifCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* External link */}
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
            <p className="text-[9px] text-white/30 capitalize">{user?.role ?? "admin"}</p>
          </div>
          <button
            onClick={() => authClient.signOut()}
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

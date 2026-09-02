import { useEffect, useState } from "react";
import {
  CalendarCheck,
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  UserPlus,
  Zap,
  MapPin,
  Building2,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { formatUSD } from "@/frontend/data/catalog";
import { usePublicCatalog } from "@/frontend/data/catalog";
import { adminGetDashboardBookings, adminGetClients } from "@/backend";
import type { AdminTab } from "@/frontend/admin/admin-layout";

type DashboardBooking = Awaited<ReturnType<typeof adminGetDashboardBookings>>[number];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

interface KpiCardProps {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string;
  change?: string | undefined;
  positive?: boolean | undefined;
  color: string;
}
function KpiCard({ icon: Icon, label, value, change, positive, color }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 hover:bg-white/[0.04] transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-lg", color)}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        {change && (
          <span
            className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
              positive ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10",
            )}
          >
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white leading-none mb-1">{value}</p>
      <p className="text-xs text-white/35 font-medium">{label}</p>
    </div>
  );
}

const STATUS_DOT: Record<string, string> = {
  confirmed: "bg-emerald-400",
  active: "bg-[#818cf8]",
  pending: "bg-amber-400",
  cancelled: "bg-red-400",
  completed: "bg-white/30",
};

const STATUS_TEXT: Record<string, string> = {
  confirmed: "text-emerald-400",
  active: "text-[#818cf8]",
  pending: "text-amber-400",
  cancelled: "text-red-400",
  completed: "text-white/40",
};

export function AdminDashboard({ onNavigate }: { onNavigate: (tab: AdminTab) => void }) {
  const { locale } = useI18n();
  const isId = locale === "id";
  const { locations } = usePublicCatalog();
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetDashboardBookings().then((data) => {
      setBookings(data);
      setLoading(false);
    });
    adminGetClients().then((data) => {
      setMemberCount((data.profiles ?? []).length);
    });
  }, []);

  const todayBookings = bookings.filter((b) => b.booking_date === todayISO());
  const totalRevToday = todayBookings.reduce((s, b) => s + (b.total_amount ?? 0), 0);
  const activeNow = todayBookings.filter((b) => b.status === "confirmed").length;
  const pending = bookings.filter((b) => b.status === "pending").length;

  const recent = bookings.slice(0, 6);

  const kpis: KpiCardProps[] = [
    {
      icon: CalendarCheck,
      label: isId ? "Pemesanan Hari Ini" : "Today's Bookings",
      value: String(todayBookings.length),
      change: "+2",
      positive: true,
      color: "bg-[#6366f1]/20",
    },
    {
      icon: Users,
      label: isId ? "Anggota Aktif" : "Active Members",
      value: memberCount === null ? "—" : String(memberCount),
      color: "bg-[#0ea5e9]/20",
    },
    {
      icon: Activity,
      label: isId ? "Aktif Sekarang" : "Active Now",
      value: String(activeNow),
      color: "bg-purple-500/20",
    },
    {
      icon: DollarSign,
      label: isId ? "Pendapatan Hari Ini" : "Revenue Today",
      value: formatUSD(totalRevToday),
      change: "+12%",
      positive: true,
      color: "bg-emerald-500/20",
    },
    {
      icon: Clock,
      label: isId ? "Tertunda" : "Pending Payments",
      value: String(pending),
      change: pending > 0 ? `${pending}` : undefined,
      positive: false,
      color: "bg-amber-500/20",
    },
    {
      icon: TrendingUp,
      label: isId ? "Total Transaksi" : "Total Bookings",
      value: String(bookings.length),
      color: "bg-pink-500/20",
    },
  ];

  const quickActions = [
    {
      label: isId ? "Lokasi Baru" : "Add Location",
      tab: "locations",
      color: "from-[#6366f1]/25 to-[#6366f1]/10 border-[#6366f1]/25 hover:border-[#6366f1]/50",
    },
    {
      label: isId ? "Ruangan Baru" : "Add Workspace",
      tab: "spaces",
      color: "from-[#0ea5e9]/25 to-[#0ea5e9]/10 border-[#0ea5e9]/25 hover:border-[#0ea5e9]/50",
    },
    {
      label: isId ? "Buat Booking" : "Create Booking",
      tab: "bookings",
      color:
        "from-emerald-500/20 to-emerald-500/5 border-emerald-500/25 hover:border-emerald-500/50",
    },
    {
      label: isId ? "Tambah Member" : "Add Member",
      tab: "members",
      color: "from-amber-500/20 to-amber-500/5 border-amber-500/25 hover:border-amber-500/50",
    },
    {
      label: isId ? "Paket Harga" : "Memberships",
      tab: "memberships",
      color: "from-purple-500/20 to-purple-500/5 border-purple-500/25 hover:border-purple-500/50",
    },
    {
      label: isId ? "Lihat Analitik" : "Analytics",
      tab: "analytics",
      color: "from-pink-500/20 to-pink-500/5 border-pink-500/25 hover:border-pink-500/50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Today's Bookings Table */}
        <div className="xl:col-span-2 rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-[#818cf8]" />
              <span className="text-sm font-semibold text-white">
                {isId ? "Pemesanan Hari Ini" : "Today's Bookings"}
              </span>
              <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
                {todayBookings.length}
              </span>
            </div>
            <button
              onClick={() => onNavigate("bookings")}
              className="text-xs text-[#818cf8] hover:text-white flex items-center gap-1 transition-colors"
            >
              {isId ? "Semua" : "View all"} <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="py-12 text-center text-white/25 text-sm">
              {isId ? "Memuat…" : "Loading…"}
            </div>
          ) : todayBookings.length === 0 ? (
            <div className="py-12 text-center text-white/25 text-sm">
              {isId ? "Belum ada pemesanan hari ini." : "No bookings today yet."}
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {todayBookings.slice(0, 8).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      STATUS_DOT[b.status] ?? "bg-white/20",
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {b.workspace_name ?? "—"}
                    </p>
                    <p className="text-xs text-white/30">
                      {b.start_time} – {b.end_time}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-semibold capitalize shrink-0",
                      STATUS_TEXT[b.status] ?? "text-white/30",
                    )}
                  >
                    {b.status}
                  </span>
                  <span className="text-sm font-bold text-white shrink-0">
                    {formatUSD(b.total_amount ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">
              {isId ? "Aksi Cepat" : "Quick Actions"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((a) => (
                <button
                  key={a.tab}
                  onClick={() => onNavigate(a.tab as AdminTab)}
                  className={cn(
                    "p-3 rounded-xl border bg-gradient-to-br text-xs font-semibold text-white text-left transition-all hover:scale-[1.02]",
                    a.color,
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
              <Activity className="w-3.5 h-3.5 text-[#818cf8]" />
              <span className="text-sm font-semibold text-white">
                {isId ? "Aktivitas Terkini" : "Recent Activity"}
              </span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {recent.map((b, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-7 h-7 rounded-full bg-[#6366f1]/15 border border-[#6366f1]/20 flex items-center justify-center shrink-0">
                    {b.status === "cancelled" ? (
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                    ) : b.status === "confirmed" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium truncate">
                      {b.workspace_name ?? "Booking"}
                    </p>
                    <p className="text-[10px] text-white/25">
                      {b.booking_date} · {b.reference ?? "N/A"}
                    </p>
                  </div>
                </div>
              ))}
              {recent.length === 0 && !loading && (
                <div className="py-6 text-center text-white/25 text-xs">
                  {isId ? "Tidak ada aktivitas." : "No activity yet."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Location Occupancy Overview */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-[#818cf8]" />
          <span className="text-sm font-semibold text-white">
            {isId ? "Okupansi per Lokasi" : "Occupancy by Location"}
          </span>
        </div>
        {locations.length === 0 ? (
          <p className="text-xs text-white/25 py-4 text-center">
            {isId ? "Belum ada lokasi." : "No locations yet."}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {locations.map((loc) => (
              <div key={loc.slug}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-white font-medium">{loc.name}</span>
                  <span className="text-sm font-bold text-white">{loc.occupancy}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#0ea5e9] transition-all"
                    style={{ width: `${Math.min(loc.occupancy, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-white/25 mt-1">
                  {loc.roomsAvailable} / {loc.roomsTotal}{" "}
                  {isId ? "ruang tersedia" : "rooms available"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

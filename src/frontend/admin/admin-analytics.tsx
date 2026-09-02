import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Users, CalendarCheck, XCircle, MapPin, Building2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatUSD } from "@/frontend/data/catalog";
import { adminGetAnalytics } from "@/backend";

interface BookingLite {
  id: string;
  status: string;
  total_amount: number;
  booking_date: string;
  location_slug: string;
  workspace_name: string;
  created_at: string;
  user_id: string;
}
interface ProfileLite {
  id: string;
  created_at: string;
}

function Bar({
  label,
  value,
  max,
  money,
}: {
  label: string;
  value: number;
  max: number;
  money: (n: number) => string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-white/60 truncate">{label}</span>
        <span className="text-xs font-bold text-white shrink-0 ml-2">{formatUSD(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#0ea5e9]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function AdminAnalytics() {
  const { locale } = useI18n();
  const isId = locale === "id";
  const [bookings, setBookings] = useState<BookingLite[]>([]);
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await adminGetAnalytics();
      setBookings(data.bookings as BookingLite[]);
      setProfiles(data.profiles as ProfileLite[]);
      setLoading(false);
    }
    void load();
  }, []);

  const stats = useMemo(() => {
    const total = bookings.length;
    const confirmed = bookings.filter((b) => b.status === "confirmed");
    const cancelled = bookings.filter((b) => b.status === "cancelled");
    const revenue = confirmed.reduce((s, b) => s + (b.total_amount ?? 0), 0);

    const byLocation: Record<string, number> = {};
    const byWorkspace: Record<string, number> = {};
    confirmed.forEach((b) => {
      byLocation[b.location_slug] = (byLocation[b.location_slug] ?? 0) + (b.total_amount ?? 0);
      byWorkspace[b.workspace_name] = (byWorkspace[b.workspace_name] ?? 0) + (b.total_amount ?? 0);
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newMembers = profiles.filter((p) => new Date(p.created_at) >= thirtyDaysAgo).length;

    return {
      total,
      confirmedCount: confirmed.length,
      cancelledCount: cancelled.length,
      cancellationRate: total > 0 ? Math.round((cancelled.length / total) * 100) : 0,
      revenue,
      byLocation: Object.entries(byLocation).sort((a, b) => b[1] - a[1]),
      byWorkspace: Object.entries(byWorkspace)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6),
      totalMembers: profiles.length,
      newMembers,
    };
  }, [bookings, profiles]);

  const maxLocation = Math.max(1, ...stats.byLocation.map(([, v]) => v));
  const maxWorkspace = Math.max(1, ...stats.byWorkspace.map(([, v]) => v));

  if (loading) {
    return (
      <div className="py-20 text-center text-white/25 text-sm">
        {isId ? "Memuat analitik…" : "Loading analytics…"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            icon: TrendingUp,
            label: isId ? "Total Pendapatan" : "Total Revenue",
            value: formatUSD(stats.revenue),
            color: "bg-emerald-500/20",
          },
          {
            icon: CalendarCheck,
            label: isId ? "Total Booking" : "Total Bookings",
            value: String(stats.total),
            color: "bg-[#6366f1]/20",
          },
          {
            icon: XCircle,
            label: isId ? "Tingkat Batal" : "Cancellation Rate",
            value: `${stats.cancellationRate}%`,
            color: "bg-red-500/20",
          },
          {
            icon: Users,
            label: isId ? "Member Baru (30h)" : "New Members (30d)",
            value: String(stats.newMembers),
            color: "bg-amber-500/20",
          },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className={`w-8 h-8 rounded-lg ${k.color} flex items-center justify-center mb-3`}>
              <k.icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-xl font-bold text-white leading-none mb-1">{k.value}</p>
            <p className="text-xs text-white/35">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-[#818cf8]" />
            <span className="text-sm font-semibold text-white">
              {isId ? "Pendapatan per Lokasi" : "Revenue by Location"}
            </span>
          </div>
          {stats.byLocation.length === 0 ? (
            <p className="text-xs text-white/25 py-4 text-center">
              {isId ? "Belum ada data." : "No data yet."}
            </p>
          ) : (
            <div className="space-y-3">
              {stats.byLocation.map(([loc, val]) => (
                <Bar key={loc} label={loc} value={val} max={maxLocation} money={formatUSD} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-[#818cf8]" />
            <span className="text-sm font-semibold text-white">
              {isId ? "Pendapatan per Ruang Kerja" : "Revenue by Workspace"}
            </span>
          </div>
          {stats.byWorkspace.length === 0 ? (
            <p className="text-xs text-white/25 py-4 text-center">
              {isId ? "Belum ada data." : "No data yet."}
            </p>
          ) : (
            <div className="space-y-3">
              {stats.byWorkspace.map(([ws, val]) => (
                <Bar key={ws} label={ws} value={val} max={maxWorkspace} money={formatUSD} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-[#818cf8]" />
          <span className="text-sm font-semibold text-white">
            {isId ? "Ringkasan Pelanggan" : "Customer Summary"}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            {
              label: isId ? "Total Akun Terdaftar" : "Total Registered Accounts",
              value: stats.totalMembers,
            },
            {
              label: isId ? "Booking Terkonfirmasi" : "Confirmed Bookings",
              value: stats.confirmedCount,
            },
            {
              label: isId ? "Booking Dibatalkan" : "Cancelled Bookings",
              value: stats.cancelledCount,
            },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-white/30 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

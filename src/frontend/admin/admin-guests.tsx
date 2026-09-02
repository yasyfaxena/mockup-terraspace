import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock, Search, UserPlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { adminGetGuests, adminUpdateGuest, adminDeleteGuest, adminCreateGuest } from "@/backend";
import { useAdminNotifications } from "@/lib/admin-notifications";

type GuestStatus = "scheduled" | "active" | "completed" | "cancelled" | "expired";

interface GuestRow {
  id: string;
  guest_name: string;
  access_from: string | null;
  access_until: string | null;
  status: string;
  booking_id: string;
  booking_reference: string;
  workspace_name: string;
  location_slug: string;
  booking_date: string;
  user_id: string;
}

const STATUS_CFG: Record<
  GuestStatus,
  { label: string; labelId: string; cls: string; icon: React.FC<{ className?: string }> }
> = {
  scheduled: {
    label: "Scheduled",
    labelId: "Dijadwalkan",
    cls: "text-[#818cf8] bg-[#6366f1]/10 border-[#6366f1]/25",
    icon: Clock,
  },
  active: {
    label: "Active",
    labelId: "Aktif",
    cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    icon: CheckCircle2,
  },
  completed: {
    label: "Completed",
    labelId: "Selesai",
    cls: "text-white/40 bg-white/5 border-white/10",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    labelId: "Dibatalkan",
    cls: "text-red-400 bg-red-400/10 border-red-400/20",
    icon: XCircle,
  },
  expired: {
    label: "Expired",
    labelId: "Kadaluarsa",
    cls: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    icon: Clock,
  },
};

export function AdminGuests() {
  const { locale } = useI18n();
  const isId = locale === "id";
  const { notify } = useAdminNotifications();
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<GuestStatus | "all">("all");

  useEffect(() => {
    async function load() {
      const data = await adminGetGuests();
      setGuests(data as GuestRow[]);
      setLoading(false);
    }
    void load();
  }, []);

  async function addGuest() {
    const bookingId = window.prompt("Booking ID");
    if (!bookingId) return;
    const guestName = window.prompt(isId ? "Nama tamu" : "Guest name");
    if (!guestName) return;
    const guestEmail = window.prompt("Guest email", "");
    try {
      await adminCreateGuest({ data: { bookingId, guestName, guestEmail: guestEmail || null } });
      const data = await adminGetGuests();
      setGuests(data as GuestRow[]);
      notify({
        kind: "created",
        title: isId ? `Tamu ditambahkan — ${guestName}` : `Guest added — ${guestName}`,
      });
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : "Failed to create guest");
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      const updated = await adminUpdateGuest({ data: { id, status } });
      setGuests((prev) => prev.map((g) => (g.id === id ? { ...g, status: updated.status } : g)));
      notify({
        kind: "updated",
        title: isId ? `Status tamu diperbarui — ${status}` : `Guest status updated — ${status}`,
      });
    } catch (error) {
      console.error(error);
    }
  }

  async function removeGuest(id: string) {
    if (!window.confirm(isId ? "Hapus tamu ini?" : "Delete this guest?")) return;
    try {
      await adminDeleteGuest({ data: { id } });
      setGuests((prev) => prev.filter((g) => g.id !== id));
      notify({ kind: "deleted", title: isId ? "Tamu dihapus" : "Guest deleted" });
    } catch (error) {
      console.error(error);
    }
  }

  const filtered = guests.filter((g) => {
    const matchSearch = !search || g.guest_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || g.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusKeys: (GuestStatus | "all")[] = [
    "all",
    "scheduled",
    "active",
    "completed",
    "cancelled",
    "expired",
  ];

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          onClick={() => void addGuest()}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#818cf8] text-white text-xs font-bold"
        >
          + {isId ? "Tambah Tamu" : "Add Guest"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: isId ? "Total Tamu" : "Total Guests", value: guests.length },
          {
            label: isId ? "Dijadwalkan" : "Scheduled",
            value: guests.filter((g) => g.status === "scheduled").length,
          },
          {
            label: isId ? "Aktif" : "Active",
            value: guests.filter((g) => g.status === "active").length,
          },
          {
            label: isId ? "Selesai" : "Completed",
            value: guests.filter((g) => g.status === "completed").length,
          },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-white/30 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isId ? "Cari nama tamu…" : "Search guest name…"}
            className="pl-9 pr-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#6366f1]/40 transition-all"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {statusKeys.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-all",
                statusFilter === s
                  ? "bg-[#6366f1]/20 border-[#6366f1]/40 text-[#a5b4fc]"
                  : "bg-white/[0.03] border-white/[0.07] text-white/35 hover:text-white hover:bg-white/[0.06]",
              )}
            >
              {s === "all"
                ? isId
                  ? "Semua"
                  : "All"
                : isId
                  ? STATUS_CFG[s].labelId
                  : STATUS_CFG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
        <div className="hidden lg:grid grid-cols-[1fr_1fr_1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-white/[0.06] text-[10px] uppercase tracking-wider font-bold text-white/20">
          <span>{isId ? "Nama Tamu" : "Guest"}</span>
          <span>{isId ? "Booking" : "Booking"}</span>
          <span>{isId ? "Ruangan" : "Workspace"}</span>
          <span>{isId ? "Tanggal" : "Date"}</span>
          <span>{isId ? "Akses" : "Access Window"}</span>
          <span>Status</span>
        </div>

        {loading ? (
          <div className="py-14 text-center text-white/25 text-sm">
            {isId ? "Memuat…" : "Loading…"}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-2 text-center">
            <UserPlus className="w-6 h-6 text-white/15" />
            <p className="text-sm text-white/30">
              {isId ? "Belum ada tamu tercatat." : "No guests recorded yet."}
            </p>
            <p className="text-xs text-white/20 max-w-xs">
              {isId
                ? "Tamu akan muncul di sini setelah member menambahkan tamu ke booking mereka."
                : "Guests will appear here once members add guests to their bookings."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((g) => {
              const status = (
                STATUS_CFG[g.status as GuestStatus] ? g.status : "scheduled"
              ) as GuestStatus;
              const scfg = STATUS_CFG[status];
              return (
                <div
                  key={g.id}
                  className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr_auto_auto_auto] gap-2 lg:gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors items-center"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#6366f1]/15 border border-[#6366f1]/20 flex items-center justify-center text-xs font-bold text-[#818cf8] shrink-0">
                      {g.guest_name[0]?.toUpperCase()}
                    </div>
                    <p className="text-sm font-semibold text-white">{g.guest_name}</p>
                  </div>
                  <p className="text-xs text-white/30 font-mono">{g.booking_reference ?? "—"}</p>
                  <div>
                    <p className="text-xs text-white/70">{g.workspace_name ?? "—"}</p>
                    <p className="text-[10px] text-white/30">{g.location_slug ?? "—"}</p>
                  </div>
                  <span className="text-xs text-white/50">{g.booking_date ?? "—"}</span>
                  <span className="text-xs text-white/50 whitespace-nowrap">
                    {g.access_from ?? "—"} – {g.access_until ?? "—"}
                  </span>
                  <div className="flex items-center gap-1">
                    <select
                      value={status}
                      onChange={(e) => void updateStatus(g.id, e.target.value)}
                      className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-full border bg-transparent focus:outline-none",
                        scfg.cls,
                      )}
                    >
                      {(["scheduled", "active", "completed", "cancelled", "expired"] as const).map(
                        (s) => (
                          <option key={s} value={s} className="bg-[#0d1224] text-white">
                            {isId ? STATUS_CFG[s].labelId : STATUS_CFG[s].label}
                          </option>
                        ),
                      )}
                    </select>
                    <button
                      onClick={() => void removeGuest(g.id)}
                      className="p-1.5 rounded-lg hover:bg-red-400/10 text-white/25 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

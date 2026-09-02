import { useEffect, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  QrCode,
  ChevronDown,
  X,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { formatUSD } from "@/frontend/data/catalog";
import {
  adminGetBookings,
  adminUpdateBooking,
  adminDeleteBooking,
  adminCreateBooking,
  adminGetClients,
  adminGetCatalog,
} from "@/backend";
import { useAdminNotifications } from "@/lib/admin-notifications";

type BookingStatus = "all" | "confirmed" | "pending" | "cancelled";

interface Booking {
  id: string;
  user_id: string;
  workspace_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_amount: number;
  method: string;
  reference: string;
  access_code: string;
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  pending: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  cancelled: "text-red-400 bg-red-400/10 border-red-400/20",
  default: "text-white/40 bg-white/5 border-white/10",
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES["default"];
  return (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border capitalize", style)}>
      {status}
    </span>
  );
}

function BookingModal({
  booking,
  onClose,
  money,
}: {
  booking: Booking;
  onClose: () => void;
  money: (amount: number) => string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#0d1224] shadow-2xl shadow-black/60 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <h2 className="text-base font-bold text-white">Booking Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366f1]/30 to-[#0ea5e9]/20 border border-[#6366f1]/20 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-[#818cf8]" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{booking.workspace_name}</p>
              <p className="text-xs text-white/40">{booking.reference}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Date", value: booking.booking_date },
              { label: "Time", value: `${booking.start_time} – ${booking.end_time}` },
              { label: "Total", value: formatUSD(booking.total_amount ?? 0) },
              { label: "Method", value: booking.method ?? "—" },
              { label: "Status", value: booking.status },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-white/[0.03] rounded-lg px-3 py-2.5 border border-white/[0.05]"
              >
                <p className="text-[10px] text-white/30 mb-0.5 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-semibold text-white capitalize">{value}</p>
              </div>
            ))}
          </div>

          {booking.access_code && (
            <div className="bg-[#6366f1]/10 border border-[#6366f1]/20 rounded-xl px-4 py-3">
              <p className="text-[10px] text-[#818cf8] mb-1 uppercase tracking-wider">
                Access Code
              </p>
              <p className="text-xl font-mono font-bold text-white tracking-widest">
                {booking.access_code}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SimpleUser {
  id: string;
  name: string;
  email: string;
}

interface SimpleWorkspace {
  id: string;
  name: string;
  locationSlug: string;
}

function AddBookingModal({
  users,
  workspaces,
  isId,
  onClose,
  onCreate,
}: {
  users: SimpleUser[];
  workspaces: SimpleWorkspace[];
  isId: boolean;
  onClose: () => void;
  onCreate: (values: {
    userId: string;
    workspaceId: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
  }) => Promise<void>;
}) {
  const [userId, setUserId] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const labelCls = "text-[10px] uppercase tracking-wider text-white/35";
  const inputCls =
    "w-full rounded-lg border border-white/[.08] bg-white/[.05] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#6366f1]/50";

  async function handleSave() {
    if (!userId || !workspaceId || !bookingDate || !startTime || !endTime) {
      setError(isId ? "Semua kolom wajib diisi." : "All fields are required.");
      return;
    }
    if (startTime >= endTime) {
      setError(
        isId
          ? "Waktu selesai harus setelah waktu mulai."
          : "End time must be after start time.",
      );
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onCreate({ userId, workspaceId, bookingDate, startTime, endTime });
    } catch (err) {
      setError(err instanceof Error ? err.message : (isId ? "Gagal membuat booking." : "Failed to create booking."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.1] bg-[#0d1224] shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <h2 className="text-base font-bold text-white">
            {isId ? "Tambah Booking" : "Add Booking"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          <label className="grid gap-1">
            <span className={labelCls}>{isId ? "Pengguna" : "User"}</span>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className={inputCls}
            >
              <option value="">{isId ? "Pilih pengguna…" : "Select a user…"}</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email} {u.name ? `(${u.email})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className={labelCls}>{isId ? "Ruang Kerja" : "Workspace"}</span>
            <select
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className={inputCls}
            >
              <option value="">{isId ? "Pilih ruang kerja…" : "Select a workspace…"}</option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} — {w.locationSlug}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className={labelCls}>{isId ? "Tanggal" : "Date"}</span>
            <input
              type="date"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              className={inputCls}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className={labelCls}>{isId ? "Mulai" : "Start time"}</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="grid gap-1">
              <span className={labelCls}>{isId ? "Selesai" : "End time"}</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="w-full rounded-xl bg-gradient-to-r from-[#6366f1] to-[#818cf8] py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? (isId ? "Menyimpan…" : "Saving…") : isId ? "Simpan Booking" : "Save Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminBookings() {
  const { locale } = useI18n();
  const { notify } = useAdminNotifications();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus>("all");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [workspaces, setWorkspaces] = useState<SimpleWorkspace[]>([]);

  const isId = locale === "id";

  useEffect(() => {
    async function load() {
      const data = await adminGetBookings();
      setBookings(data as Booking[]);
      setLoading(false);
    }
    load();
  }, []);

  async function openAddModal() {
    // Load fresh user/workspace lists so the dropdowns are up to date.
    const [clients, catalog] = await Promise.all([adminGetClients(), adminGetCatalog()]);
    setUsers(
      (clients.profiles as { id: string; full_name: string; email: string }[]).map((p) => ({
        id: p.id,
        name: p.full_name,
        email: p.email,
      })),
    );
    setWorkspaces(
      (catalog.workspaces as { id: string; name: string; locationSlug: string }[]).map((w) => ({
        id: w.id,
        name: w.name,
        locationSlug: w.locationSlug,
      })),
    );
    setShowAddModal(true);
  }

  async function createBooking(values: {
    userId: string;
    workspaceId: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
  }) {
    await adminCreateBooking({ data: values });
    setBookings((await adminGetBookings()) as Booking[]);
    notify({
      kind: "created",
      title: isId ? "Booking ditambahkan" : "Booking created",
      subtitle: `${values.bookingDate} · ${values.startTime}–${values.endTime}`,
    });
    setShowAddModal(false);
  }

  async function updateStatus(id: string, status: string) {
    try {
      const updated = await adminUpdateBooking({ data: { id, status } });
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: updated.status } : b)));
      if (selected?.id === id)
        setSelected((prev) => (prev ? { ...prev, status: updated.status } : prev));
      notify({
        kind: status === "cancelled" ? "cancellation" : "updated",
        title: isId
          ? `Status booking diperbarui — ${status}`
          : `Booking status updated — ${status}`,
      });
    } catch (error) {
      console.error(error);
    }
  }

  async function removeBooking(id: string) {
    if (!window.confirm(isId ? "Hapus booking ini?" : "Delete this booking?")) return;
    try {
      await adminDeleteBooking({ data: { id } });
      setBookings((prev) => prev.filter((b) => b.id !== id));
      setSelected(null);
      notify({ kind: "deleted", title: isId ? "Booking dihapus" : "Booking deleted" });
    } catch (error) {
      console.error(error);
    }
  }

  const filtered = bookings.filter((b) => {
    const matchSearch =
      !search ||
      (b.workspace_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (b.reference ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filterOptions: { value: BookingStatus; label: string }[] = [
    { value: "all", label: isId ? "Semua" : "All" },
    { value: "confirmed", label: isId ? "Terkonfirmasi" : "Confirmed" },
    { value: "pending", label: isId ? "Tertunda" : "Pending" },
    { value: "cancelled", label: isId ? "Dibatalkan" : "Cancelled" },
  ];

  return (
    <div className="space-y-5">
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => void openAddModal()}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#818cf8] text-white text-xs font-bold"
        >
          + {isId ? "Tambah Booking" : "Add Booking"}
        </button>
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isId ? "Cari nama ruang, referensi…" : "Search workspace, reference…"}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#6366f1]/50 focus:bg-white/[0.06] transition-all"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-white/30 shrink-0" />
          <div className="flex gap-1.5 flex-wrap">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  statusFilter === opt.value
                    ? "bg-[#6366f1]/20 border-[#6366f1]/40 text-[#a5b4fc]"
                    : "bg-white/[0.03] border-white/[0.07] text-white/40 hover:text-white hover:bg-white/[0.06]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
        {/* Table head */}
        <div className="hidden sm:grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-white/[0.06] text-[10px] uppercase tracking-wider font-semibold text-white/25">
          <span>{isId ? "Ruang Kerja" : "Workspace"}</span>
          <span>{isId ? "Tanggal & Waktu" : "Date & Time"}</span>
          <span>{isId ? "Total" : "Total"}</span>
          <span>Status</span>
          <span></span>
        </div>

        {loading ? (
          <div className="py-14 text-center text-white/30 text-sm">
            {isId ? "Memuat…" : "Loading…"}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center text-white/30 text-sm">
            {isId ? "Tidak ada pemesanan." : "No bookings found."}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((b) => (
              <div
                key={b.id}
                className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto_auto] gap-2 sm:gap-4 px-5 py-4 hover:bg-white/[0.025] transition-colors items-center"
              >
                {/* Workspace */}
                <div>
                  <p className="text-sm font-medium text-white">{b.workspace_name ?? "—"}</p>
                  <p className="text-xs text-white/30 font-mono">{b.reference ?? "N/A"}</p>
                </div>
                {/* Date & time */}
                <div>
                  <p className="text-sm text-white/80">{b.booking_date}</p>
                  <p className="text-xs text-white/30">
                    {b.start_time} – {b.end_time}
                  </p>
                </div>
                {/* Total */}
                <span className="text-sm font-semibold text-white">{formatUSD(b.total_amount ?? 0)}</span>
                {/* Status */}
                <StatusBadge status={b.status ?? "pending"} />
                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelected(b)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <select
                    value={b.status}
                    onChange={(e) => void updateStatus(b.id, e.target.value)}
                    className="max-w-[105px] px-1.5 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-[10px] text-white focus:outline-none"
                    title="Update status"
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button
                    onClick={() => void removeBooking(b.id)}
                    className="p-1.5 rounded-lg hover:bg-red-400/10 text-white/25 hover:text-red-400 transition-colors"
                    title="Delete booking"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <BookingModal booking={selected} onClose={() => setSelected(null)} money={formatUSD} />
      )}
      {showAddModal && (
        <AddBookingModal
          users={users}
          workspaces={workspaces}
          isId={isId}
          onClose={() => setShowAddModal(false)}
          onCreate={createBooking}
        />
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, Eye, X, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { formatUSD } from "@/frontend/data/catalog";
import { adminGetPaymentsDetailed, adminUpdateBooking, adminDeleteBooking } from "@/backend";
import { useAdminNotifications } from "@/lib/admin-notifications";

type PayFilter = "all" | "confirmed" | "pending" | "cancelled";

interface PaymentRow {
  id: string;
  reference: string;
  workspace_name: string;
  total_amount: number;
  method: string;
  status: string;
  booking_date: string;
  created_at: string;
  user_id: string;
  profiles: { full_name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  pending: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  cancelled: "text-red-400 bg-red-400/10 border-red-400/20",
  default: "text-white/40 bg-white/5 border-white/10",
};

const STATUS_LABEL: Record<string, { en: string; id: string }> = {
  confirmed: { en: "Successful", id: "Berhasil" },
  pending: { en: "Pending", id: "Tertunda" },
  cancelled: { en: "Failed", id: "Gagal" },
};

function PaymentModal({
  p,
  onClose,
  money,
}: {
  p: PaymentRow;
  onClose: () => void;
  money: (n: number) => string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#0d1224] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <h2 className="text-base font-bold text-white">Transaction Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 gap-3">
          {[
            { label: "Reference", value: p.reference },
            { label: "Customer", value: p.profiles?.full_name ?? "—" },
            { label: "Workspace", value: p.workspace_name },
            { label: "Amount", value: formatUSD(p.total_amount ?? 0) },
            { label: "Method", value: p.method ?? "—" },
            { label: "Status", value: STATUS_LABEL[p.status]?.en ?? p.status },
            { label: "Booking Date", value: p.booking_date },
            { label: "Created", value: new Date(p.created_at).toLocaleString() },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-white/[0.03] rounded-lg px-3 py-2.5 border border-white/[0.05]"
            >
              <p className="text-[10px] text-white/30 mb-0.5 uppercase tracking-wider">{label}</p>
              <p className="text-sm font-semibold text-white truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminPayments() {
  const { locale } = useI18n();
  const isId = locale === "id";
  const { notify } = useAdminNotifications();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PayFilter>("all");
  const [selected, setSelected] = useState<PaymentRow | null>(null);

  useEffect(() => {
    async function load() {
      const data = await adminGetPaymentsDetailed();
      setRows(data as PaymentRow[]);
      setLoading(false);
    }
    void load();
  }, []);

  async function updateStatus(id: string, status: string) {
    try {
      const updated = await adminUpdateBooking({ data: { id, status } });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: updated.status } : r)));
      setSelected((prev) => (prev?.id === id ? { ...prev, status: updated.status } : prev));
      notify({
        kind: "updated",
        title: isId
          ? `Status transaksi diperbarui — ${status}`
          : `Payment status updated — ${status}`,
      });
    } catch (error) {
      console.error(error);
    }
  }

  async function removePayment(id: string) {
    if (!window.confirm(isId ? "Hapus transaksi/booking ini?" : "Delete this transaction/booking?"))
      return;
    try {
      await adminDeleteBooking({ data: { id } });
      setRows((prev) => prev.filter((r) => r.id !== id));
      setSelected(null);
      notify({ kind: "deleted", title: isId ? "Transaksi dihapus" : "Payment deleted" });
    } catch (error) {
      console.error(error);
    }
  }

  const filtered = rows.filter((r) => {
    const matchSearch =
      !search ||
      (r.reference ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.profiles?.full_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filter === "all" || r.status === filter;
    return matchSearch && matchStatus;
  });

  const totalRevenue = rows
    .filter((r) => r.status === "confirmed")
    .reduce((s, r) => s + (r.total_amount ?? 0), 0);
  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const failedCount = rows.filter((r) => r.status === "cancelled").length;

  const filterOptions: { value: PayFilter; label: string }[] = [
    { value: "all", label: isId ? "Semua" : "All" },
    { value: "confirmed", label: isId ? "Berhasil" : "Successful" },
    { value: "pending", label: isId ? "Tertunda" : "Pending" },
    { value: "cancelled", label: isId ? "Gagal" : "Failed" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: isId ? "Total Pendapatan" : "Total Revenue", value: formatUSD(totalRevenue) },
          { label: isId ? "Total Transaksi" : "Total Transactions", value: String(rows.length) },
          { label: isId ? "Tertunda" : "Pending", value: String(pendingCount) },
          { label: isId ? "Gagal" : "Failed", value: String(failedCount) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs text-white/30 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isId ? "Cari referensi atau nama…" : "Search reference or name…"}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#6366f1]/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-white/30 shrink-0" />
          <div className="flex gap-1.5 flex-wrap">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  filter === opt.value
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

      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-white/[0.06] text-[10px] uppercase tracking-wider font-semibold text-white/25">
          <span>{isId ? "Pelanggan" : "Customer"}</span>
          <span>{isId ? "Referensi" : "Reference"}</span>
          <span>{isId ? "Metode" : "Method"}</span>
          <span>{isId ? "Jumlah" : "Amount"}</span>
          <span>Status</span>
          <span></span>
        </div>
        {loading ? (
          <div className="py-14 text-center text-white/30 text-sm">
            {isId ? "Memuat…" : "Loading…"}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-2 text-center">
            <Receipt className="w-6 h-6 text-white/15" />
            <p className="text-sm text-white/30">
              {isId ? "Belum ada transaksi." : "No transactions yet."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-2 sm:gap-4 px-5 py-4 hover:bg-white/[0.025] transition-colors items-center"
              >
                <div>
                  <p className="text-sm font-medium text-white">{r.profiles?.full_name ?? "—"}</p>
                  <p className="text-xs text-white/30">{r.workspace_name}</p>
                </div>
                <p className="text-xs text-white/40 font-mono">{r.reference}</p>
                <span className="text-sm text-white/60 capitalize">{r.method ?? "—"}</span>
                <span className="text-sm font-semibold text-white">{formatUSD(r.total_amount ?? 0)}</span>
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full border capitalize w-fit",
                    STATUS_STYLES[r.status] ?? STATUS_STYLES["default"],
                  )}
                >
                  {isId
                    ? (STATUS_LABEL[r.status]?.id ?? r.status)
                    : (STATUS_LABEL[r.status]?.en ?? r.status)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelected(r)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <select
                    value={r.status}
                    onChange={(e) => void updateStatus(r.id, e.target.value)}
                    className="max-w-[105px] px-1.5 py-1 rounded bg-white/[0.04] border border-white/[0.08] text-[10px] text-white focus:outline-none"
                  >
                    <option value="confirmed">Successful</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Failed</option>
                  </select>
                  <button
                    onClick={() => void removePayment(r.id)}
                    className="p-1.5 rounded-lg hover:bg-red-400/10 text-white/25 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && <PaymentModal p={selected} onClose={() => setSelected(null)} money={formatUSD} />}
    </div>
  );
}

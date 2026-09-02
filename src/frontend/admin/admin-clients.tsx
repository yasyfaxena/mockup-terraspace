import { useState, useEffect } from "react";
import {
  Search,
  Eye,
  UserCircle,
  Crown,
  Briefcase,
  User,
  CalendarCheck,
  Wallet,
  X,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { formatUSD } from "@/frontend/data/catalog";
import { adminGetClients, adminUpdateProfile, adminDeleteUser, adminCreateUser } from "@/backend";
import { useAdminNotifications } from "@/lib/admin-notifications";

type MemberStatus = "active" | "pending" | "suspended" | "inactive";
type Tier = "Enterprise" | "Pro" | "Standard";

interface Member {
  id: string;
  full_name: string;
  email?: string | undefined;
  role?: string;
  phone?: string | undefined;
  company?: string | undefined;
  status: MemberStatus;
  registrationDate: string;
  totalBookings: number;
  lifetimeSpend: number;
  tier: Tier;
  lastBooking?: string | undefined;
}

const TIER_CFG: Record<Tier, { icon: React.FC<{ className?: string }>; cls: string }> = {
  Enterprise: { icon: Crown, cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  Pro: { icon: Briefcase, cls: "text-[#818cf8] bg-[#6366f1]/10 border-[#6366f1]/25" },
  Standard: { icon: User, cls: "text-white/40 bg-white/5 border-white/10" },
};

const STATUS_CFG: Record<MemberStatus, { label: string; labelId: string; cls: string }> = {
  active: {
    label: "Active",
    labelId: "Aktif",
    cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  pending: {
    label: "Pending",
    labelId: "Tertunda",
    cls: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  },
  suspended: {
    label: "Suspended",
    labelId: "Ditangguhkan",
    cls: "text-red-400 bg-red-400/10 border-red-400/20",
  },
  inactive: {
    label: "Inactive",
    labelId: "Tidak Aktif",
    cls: "text-white/30 bg-white/5 border-white/10",
  },
};

function getTier(spend: number): Tier {
  if (spend >= 5000000) return "Enterprise";
  if (spend >= 1000000) return "Pro";
  return "Standard";
}

function DetailModal({
  member,
  onClose,
  money,
}: {
  member: Member;
  onClose: () => void;
  money: (n: number) => string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#0d1224] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6366f1]/40 to-[#0ea5e9]/30 flex items-center justify-center text-sm font-bold text-white">
              {member.full_name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{member.full_name}</p>
              <p className="text-xs text-white/30">{member.company ?? "—"}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {[
            { label: "Email", value: member.email ?? "—" },
            { label: "Phone", value: member.phone ?? "—" },
            { label: "Registered", value: member.registrationDate },
            { label: "Total Bookings", value: String(member.totalBookings) },
            { label: "Lifetime Spend", value: formatUSD(member.lifetimeSpend) },
            { label: "Last Booking", value: member.lastBooking ?? "—" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex justify-between items-center py-2 border-b border-white/[0.05]"
            >
              <span className="text-xs text-white/30">{label}</span>
              <span className="text-xs font-semibold text-white">{value}</span>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <button className="flex-1 py-2 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400 text-xs font-semibold hover:bg-red-400/20 transition-colors">
              Suspend Member
            </button>
            <button className="flex-1 py-2 rounded-lg bg-[#6366f1]/15 border border-[#6366f1]/25 text-[#818cf8] text-xs font-semibold hover:bg-[#6366f1]/25 transition-colors">
              View Bookings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminMembers() {
  const { locale } = useI18n();
  const isId = locale === "id";
  const { notify } = useAdminNotifications();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Member | null>(null);

  useEffect(() => {
    async function load() {
      const result = await adminGetClients();
      const profiles = result.profiles;
      const bookings = result.bookings;

      const agg: Record<string, { total: number; count: number; last: string }> = {};
      bookings.forEach((b) => {
        if (!b.user_id) return;
        const entry = agg[b.user_id] ?? { total: 0, count: 0, last: "" };
        entry.total += b.total_amount ?? 0;
        entry.count += 1;
        if (b.booking_date && b.booking_date > entry.last) entry.last = b.booking_date;
        agg[b.user_id] = entry;
      });

      const memberRows: Member[] = (profiles ?? [])
        .map((p) => ({
          id: p.id,
          full_name: p.full_name ?? "Unknown",
          email: p.email ?? undefined,
          role: p.role ?? "customer",
          phone: p.phone ?? undefined,
          company: p.company ?? undefined,
          status: "active" as MemberStatus,
          registrationDate: "2025-01-01",
          totalBookings: agg[p.id]?.count ?? 0,
          lifetimeSpend: agg[p.id]?.total ?? 0,
          tier: getTier(agg[p.id]?.total ?? 0),
          lastBooking: agg[p.id]?.last || undefined,
        }))
        .sort((a, b) => b.lifetimeSpend - a.lifetimeSpend);

      setMembers(memberRows);
      setLoading(false);
    }
    load();
  }, []);

  async function addMember() {
    const fullName = window.prompt(isId ? "Nama lengkap" : "Full name");
    if (!fullName) return;
    const email = window.prompt("Email");
    if (!email) return;
    const password = window.prompt(isId ? "Password awal" : "Initial password");
    if (!password) return;
    const role = window.prompt("Role (customer/staff/admin)", "customer");
    if (!role) return;
    try {
      await adminCreateUser({ data: { fullName, email, password, role } });
      notify({
        kind: "created",
        title: isId ? `Anggota ditambahkan — ${fullName}` : `Member added — ${fullName}`,
        silent: true,
      });
      window.location.reload();
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : "Failed to create user");
    }
  }

  async function editMember(member: Member) {
    const fullName = window.prompt(isId ? "Nama lengkap" : "Full name", member.full_name);
    if (fullName === null) return;
    const company = window.prompt(isId ? "Perusahaan" : "Company", member.company ?? "");
    if (company === null) return;
    const phone = window.prompt(isId ? "Telepon" : "Phone", member.phone ?? "");
    if (phone === null) return;
    const role = window.prompt("Role (customer/staff/admin)", member.role ?? "customer");
    if (role === null) return;
    try {
      const updated = await adminUpdateProfile({
        data: { id: member.id, fullName, company: company || null, phone: phone || null, role },
      });
      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id
            ? {
                ...m,
                full_name: updated.full_name,
                company: updated.company ?? undefined,
                phone: updated.phone ?? undefined,
                role: updated.role,
              }
            : m,
        ),
      );
      setSelected((prev) =>
        prev?.id === member.id
          ? {
              ...prev,
              full_name: updated.full_name,
              company: updated.company ?? undefined,
              phone: updated.phone ?? undefined,
              role: updated.role,
            }
          : prev,
      );
      notify({
        kind: "updated",
        title: isId
          ? `Anggota diperbarui — ${updated.full_name}`
          : `Member updated — ${updated.full_name}`,
      });
    } catch (error) {
      console.error(error);
    }
  }

  async function removeMember(id: string, name: string) {
    if (
      !window.confirm(
        isId
          ? "Hapus user dan seluruh booking/tamu terkait?"
          : "Delete this user and related bookings/guests?",
      )
    )
      return;
    try {
      await adminDeleteUser({ data: { id } });
      setMembers((prev) => prev.filter((m) => m.id !== id));
      setSelected(null);
      notify({
        kind: "deleted",
        title: isId ? `Anggota dihapus — ${name}` : `Member deleted — ${name}`,
      });
    } catch (error) {
      console.error(error);
    }
  }

  const filtered = members.filter(
    (m) =>
      !search ||
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (m.company ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          onClick={() => void addMember()}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#818cf8] text-white text-xs font-bold"
        >
          + {isId ? "Tambah Anggota" : "Add Member"}
        </button>
      </div>
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: isId ? "Total Anggota" : "Total Members", value: members.length },
          { label: "Enterprise", value: members.filter((m) => m.tier === "Enterprise").length },
          { label: "Pro", value: members.filter((m) => m.tier === "Pro").length },
          {
            label: isId ? "Aktif" : "Active",
            value: members.filter((m) => m.status === "active").length,
          },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-white/30 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isId ? "Cari nama atau perusahaan…" : "Search name or company…"}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#6366f1]/40 transition-all"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-white/[0.06] text-[10px] uppercase tracking-wider font-bold text-white/20">
          <span>{isId ? "Anggota" : "Member"}</span>
          <span>Tier</span>
          <span>Status</span>
          <span>{isId ? "Pemesanan" : "Bookings"}</span>
          <span>{isId ? "Total" : "Lifetime"}</span>
          <span></span>
        </div>
        {loading ? (
          <div className="py-14 text-center text-white/25 text-sm">
            {isId ? "Memuat…" : "Loading…"}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((m) => {
              const tcfg = TIER_CFG[m.tier];
              const scfg = STATUS_CFG[m.status];
              return (
                <div
                  key={m.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 md:gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366f1]/30 to-[#0ea5e9]/20 border border-[#6366f1]/20 flex items-center justify-center text-xs font-bold text-[#818cf8] shrink-0">
                      {m.full_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{m.full_name}</p>
                      <p className="text-xs text-white/30">{m.company ?? m.phone ?? "—"}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      tcfg.cls,
                    )}
                  >
                    <tcfg.icon className="w-3 h-3" />
                    {m.tier}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      scfg.cls,
                    )}
                  >
                    {isId ? scfg.labelId : scfg.label}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-white/50">
                    <CalendarCheck className="w-3 h-3 text-white/20" /> {m.totalBookings}
                  </div>
                  <div className="flex items-center gap-1 text-sm font-bold text-white">
                    <Wallet className="w-3 h-3 text-white/20" /> {formatUSD(m.lifetimeSpend)}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelected(m)}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => void editMember(m)}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors"
                      title="Edit"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => void removeMember(m.id, m.full_name)}
                      className="p-1.5 rounded-lg hover:bg-red-400/10 text-white/25 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <DetailModal member={selected} onClose={() => setSelected(null)} money={formatUSD} />
      )}
    </div>
  );
}

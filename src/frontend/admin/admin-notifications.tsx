import { useEffect } from "react";
import { CalendarCheck, XCircle, UserPlus, Bell, Pencil, Trash2, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useAdminNotifications, type AdminNotifKind } from "@/lib/admin-notifications";

const ICONS: Record<AdminNotifKind, React.FC<{ className?: string }>> = {
  new_booking: CalendarCheck,
  cancellation: XCircle,
  new_member: UserPlus,
  created: PlusCircle,
  updated: Pencil,
  deleted: Trash2,
};
const COLORS: Record<AdminNotifKind, string> = {
  new_booking: "bg-[#6366f1]/15 border-[#6366f1]/20 text-[#818cf8]",
  cancellation: "bg-red-400/10 border-red-400/20 text-red-400",
  new_member: "bg-emerald-400/10 border-emerald-400/20 text-emerald-400",
  created: "bg-emerald-400/10 border-emerald-400/20 text-emerald-400",
  updated: "bg-[#0ea5e9]/15 border-[#0ea5e9]/20 text-[#7dd3fc]",
  deleted: "bg-red-400/10 border-red-400/20 text-red-400",
};

export function AdminNotifications() {
  const { locale } = useI18n();
  const isId = locale === "id";
  const { items, markAllRead } = useAdminNotifications();

  // Opening the notifications tab clears the unread badge, per admin UX.
  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]">
          <Bell className="w-4 h-4 text-[#818cf8]" />
          <span className="text-sm font-semibold text-white">
            {isId ? "Notifikasi Terkini" : "Recent Notifications"}
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400/80 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
          </span>
        </div>

        {items.length === 0 ? (
          <div className="py-14 text-center text-white/25 text-sm">
            {isId ? "Belum ada notifikasi." : "No notifications yet."}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {items.map((n) => {
              const Icon = ICONS[n.kind];
              return (
                <div
                  key={n.id}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                      COLORS[n.kind],
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{n.title}</p>
                    {n.subtitle && <p className="text-xs text-white/30 truncate">{n.subtitle}</p>}
                  </div>
                  <span className="text-xs text-white/25 shrink-0">
                    {new Date(n.timestamp).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

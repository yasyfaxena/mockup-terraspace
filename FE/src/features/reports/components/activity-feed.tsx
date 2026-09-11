import { CalendarPlus, CalendarX, CheckCircle2, UserPlus, XCircle, RotateCcw } from "lucide-react";
import type { ActivityItemDto, ActivityType } from "../reports.types";

// Replaces two separate V1 things — admin-dashboard.tsx's "Recent Activity"
// feed and the standalone admin-notifications.tsx panel — with the one
// feed BE actually backs (`GET /admin/activity`), per features/reports.md
// §2. `summary` is pre-composed server-side; the FE never assembles its
// own prose from raw fields.
const ACTIVITY_ICONS: Record<ActivityType, React.FC<{ className?: string }>> = {
  booking_created: CalendarPlus,
  booking_cancelled: CalendarX,
  payment_succeeded: CheckCircle2,
  payment_failed: XCircle,
  payment_refunded: RotateCcw,
  user_registered: UserPlus,
};

const ACTIVITY_STYLES: Record<ActivityType, string> = {
  booking_created: "text-primary bg-primary/10",
  booking_cancelled: "text-warning-foreground bg-warning/15",
  payment_succeeded: "text-success bg-success/10",
  payment_failed: "text-destructive bg-destructive/10",
  payment_refunded: "text-primary bg-primary/10",
  user_registered: "text-white/60 bg-white/[.06]",
};

function relativeTime(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ActivityFeed({ items }: { items: ActivityItemDto[] }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-white/40">No activity yet.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const Icon = ACTIVITY_ICONS[item.type];
        return (
          <div key={item.id} className="flex items-start gap-3 rounded-lg px-2 py-1.5">
            <span className={`mt-0.5 rounded-lg p-1.5 ${ACTIVITY_STYLES[item.type]}`}>
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white/80">{item.summary}</p>
              <p className="text-[11px] text-white/30">{relativeTime(item.occurredAt)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

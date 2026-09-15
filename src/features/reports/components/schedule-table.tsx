import { formatMoney } from "@/shared/format";
import type { ScheduleEntryDto } from "../reports.types";

/**
 * `startTime`/`endTime` are rendered as the literal `HH:MM` strings the API
 * returns — they come from `@db.Time` columns (venue wall-clock already,
 * bookings.md), never re-parsed through `new Date(...)`, which would
 * reinterpret them in the browser's own timezone.
 */
export function ScheduleTable({ schedule }: { schedule: ScheduleEntryDto[] }) {
  if (schedule.length === 0) {
    return <p className="py-6 text-center text-sm text-white/40">No bookings today.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[.07]">
      {schedule.map((entry) => (
        <div
          key={entry.id}
          className="flex flex-wrap items-center gap-4 border-b border-white/[.04] px-4 py-3 text-sm last:border-b-0"
        >
          <span className="w-24 shrink-0 font-mono text-xs text-white/50">
            {entry.startTime}–{entry.endTime}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-white">{entry.workspaceName}</p>
            <p className="truncate text-xs text-white/35">
              {entry.customerName} · {entry.locationName}
            </p>
          </div>
          <span className="text-xs font-semibold text-white/70">
            {formatMoney(entry.totalAmount)}
          </span>
          <span className="rounded-full border border-white/[.1] px-2 py-0.5 text-[10px] font-semibold uppercase text-white/45">
            {entry.status}
          </span>
        </div>
      ))}
    </div>
  );
}

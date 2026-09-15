import { useMemo } from "react";
import type { CalendarEntryDto } from "../bookings.types";

const HOUR_START = 8;
const HOUR_END = 20;
const HOUR_HEIGHT_PX = 56;

function timeToMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

const STATUS_COLORS: Record<CalendarEntryDto["status"], string> = {
  pending: "border-l-warning bg-warning/10 text-warning-foreground",
  confirmed: "border-l-primary bg-primary/10 text-foreground",
  cancelled: "border-l-muted-foreground/40 bg-muted text-muted-foreground line-through",
  completed: "border-l-success bg-success/10 text-foreground",
};

/**
 * Real workspace columns, derived from the fetched entries' own
 * `workspaceId`/`workspaceName` — V1's admin-calendar.tsx hardcoded two
 * room names (`"Room Borobudur"`, `"Room Prambanan"`) and matched a
 * booking to a column by substring-matching `workspace_name` against them.
 * That breaks for any location with a different room, or more than two
 * rooms. This keys everything off the real id instead
 * (development-phases.md Phase 5).
 */
export function AdminCalendarView({ entries }: { entries: CalendarEntryDto[] }) {
  const columns = useMemo(() => {
    const seen = new Map<string, string>();
    for (const entry of entries) seen.set(entry.workspaceId, entry.workspaceName);
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [entries]);

  const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

  if (columns.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/[.1] p-8 text-center text-sm text-white/40">
        No bookings for this date.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/[.08] bg-[#09101f]">
      <div
        className="grid min-w-[640px]"
        style={{ gridTemplateColumns: `64px repeat(${columns.length}, 1fr)` }}
      >
        <div className="border-b border-r border-white/[.06] bg-white/[.02]" />
        {columns.map((col) => (
          <div
            key={col.id}
            className="border-b border-r border-white/[.06] bg-white/[.02] px-2 py-2 text-center text-[11px] font-bold text-white/70 last:border-r-0"
          >
            {col.name}
          </div>
        ))}

        <div
          className="relative border-r border-white/[.06]"
          style={{ height: `${hours.length * HOUR_HEIGHT_PX}px` }}
        >
          {hours.map((h) => (
            <div
              key={h}
              className="absolute right-2 -translate-y-1/2 font-mono text-[10px] text-white/30"
              style={{ top: `${(h - HOUR_START) * HOUR_HEIGHT_PX}px` }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {columns.map((col) => (
          <div
            key={col.id}
            className="relative border-r border-white/[.06] last:border-r-0"
            style={{ height: `${hours.length * HOUR_HEIGHT_PX}px` }}
          >
            {hours.map((h) => (
              <div
                key={h}
                className="absolute inset-x-0 border-t border-white/[.04]"
                style={{ top: `${(h - HOUR_START) * HOUR_HEIGHT_PX}px` }}
              />
            ))}

            {entries
              .filter((entry) => entry.workspaceId === col.id)
              .map((entry) => {
                const startMin = timeToMinutes(entry.startTime);
                const endMin = timeToMinutes(entry.endTime);
                const top = ((startMin - HOUR_START * 60) / 60) * HOUR_HEIGHT_PX;
                const height = Math.max(20, ((endMin - startMin) / 60) * HOUR_HEIGHT_PX);
                return (
                  <div
                    key={entry.id}
                    className={`absolute inset-x-1 z-10 overflow-hidden rounded-md border-l-4 p-1.5 text-[10px] ${STATUS_COLORS[entry.status]}`}
                    style={{ top: `${top}px`, height: `${height}px` }}
                    title={`${entry.customerName} — ${entry.startTime}–${entry.endTime}`}
                  >
                    <p className="truncate font-semibold">{entry.customerName}</p>
                    <p className="truncate opacity-80">
                      {entry.startTime}–{entry.endTime}
                    </p>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}

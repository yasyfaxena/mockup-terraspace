import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useWorkspaceAvailability } from "../workspaces.queries";

const HOUR_HEIGHT_PX = 58;
const TOP_CLEARANCE_PX = 24;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function timeToMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function shiftDate(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) return dateStr;
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    return dateObj.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Reads free/busy from `GET /workspaces/:id/availability` — every interval
 * is just `{ from, to }` HH:MM strings, never a booking id/reference/name
 * (development-phases.md Phase 3 exit criteria's leak check).
 */
export function AvailabilityCalendar({ workspaceId }: { workspaceId: string }) {
  const [date, setDate] = useState(todayISO());
  const { data, isPending, isError, isFetching } = useWorkspaceAvailability(workspaceId, date);

  const openStart = data ? timeToMinutes(data.openingHours.from) : 9 * 60;
  const openEnd = data ? timeToMinutes(data.openingHours.to) : 22 * 60;
  const hours = Array.from(
    { length: Math.ceil((openEnd - openStart) / 60) + 1 },
    (_, i) => Math.floor(openStart / 60) + i,
  );

  function blockPosition(from: string, to: string) {
    const startMin = timeToMinutes(from);
    const endMin = timeToMinutes(to);
    const top = Math.max(0, ((startMin - openStart) / 60) * HOUR_HEIGHT_PX) + TOP_CLEARANCE_PX;
    const height = Math.max(26, ((endMin - startMin) / 60) * HOUR_HEIGHT_PX);
    return { top, height };
  }

  return (
    <div className="mt-10 rounded-2xl border border-border/90 bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">Availability</h2>
            {isFetching && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Visual day timeline from {data?.openingHours.from ?? "…"} to{" "}
            {data?.openingHours.to ?? "…"}. Booked blocks are locked.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 items-center rounded-xl border border-border/80 bg-background shadow-xs transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDate((d) => shiftDate(d, -1));
              }}
              disabled={date <= todayISO() || isFetching}
              aria-label="Previous day"
              className="size-8 rounded-lg text-muted-foreground hover:bg-muted/80 hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
            >
              <ChevronLeft className="size-4" />
            </Button>

            <label
              onClick={(e) => e.stopPropagation()}
              className="relative flex h-full cursor-pointer items-center justify-center border-x border-border/60 px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted/30"
            >
              <CalendarIcon className="mr-1.5 size-3.5 text-muted-foreground" />
              <span className="tabular-nums">{formatDisplayDate(date)}</span>
              <input
                type="date"
                min={todayISO()}
                value={date}
                onChange={(e) => {
                  e.stopPropagation();
                  if (e.target.value) setDate(e.target.value);
                }}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
                aria-label="Choose date"
              />
            </label>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDate((d) => shiftDate(d, 1));
              }}
              disabled={isFetching}
              aria-label="Next day"
              className="size-8 rounded-lg text-muted-foreground hover:bg-muted/80 hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDate(todayISO());
            }}
            disabled={date === todayISO() || isFetching}
            className="h-9 rounded-xl border-border/80 px-3 text-xs font-bold transition-all disabled:opacity-40"
          >
            Today
          </Button>
        </div>
      </div>

      {isPending && !data && <Skeleton className="mt-6 h-[300px] w-full rounded-xl" />}
      {isError && !data && (
        <p className="mt-6 text-sm text-destructive">Could not load availability for this date.</p>
      )}

      {data && (
        <div
          className={cn(
            "mt-6 max-h-[460px] overflow-y-auto overflow-x-hidden rounded-xl border border-border/80 bg-background shadow-inner transition-opacity duration-150",
            isFetching && "opacity-60",
          )}
        >
          <div
            className="relative grid grid-cols-[64px_1fr] select-none"
            style={{ height: `${hours.length * HOUR_HEIGHT_PX + TOP_CLEARANCE_PX}px` }}
          >
            <div className="relative border-r border-border/80 bg-muted/10">
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute right-2.5 -translate-y-1/2 text-[11px] font-mono font-bold text-muted-foreground/80"
                  style={{
                    top: `${(h * 60 - openStart) * (HOUR_HEIGHT_PX / 60) + TOP_CLEARANCE_PX}px`,
                  }}
                >
                  {String(h % 24).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            <div className="relative overflow-hidden bg-card/20">
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t border-border/50"
                  style={{
                    top: `${(h * 60 - openStart) * (HOUR_HEIGHT_PX / 60) + TOP_CLEARANCE_PX}px`,
                  }}
                />
              ))}

              {data.busy.length === 0 ? (
                <p className="absolute inset-x-4 top-6 text-xs font-medium text-success">
                  All slots free for this date.
                </p>
              ) : (
                data.busy.map((block, index) => {
                  const { top, height } = blockPosition(block.from, block.to);
                  return (
                    <div
                      key={index}
                      className="absolute inset-x-2 z-10 rounded-lg border border-l-4 border-l-destructive border-destructive/40 bg-destructive/10 p-2 text-xs"
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-destructive">
                        <XCircle className="size-3.5 shrink-0" />
                        Booked
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-destructive/80">
                        {block.from} – {block.to}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

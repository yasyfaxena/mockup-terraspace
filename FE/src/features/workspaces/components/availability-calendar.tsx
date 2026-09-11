import { ChevronLeft, ChevronRight, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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

/**
 * Reads free/busy from `GET /workspaces/:id/availability` — every interval
 * is just `{ from, to }` HH:MM strings, never a booking id/reference/name
 * (development-phases.md Phase 3 exit criteria's leak check).
 */
export function AvailabilityCalendar({ workspaceId }: { workspaceId: string }) {
  const [date, setDate] = useState(todayISO());
  const { data, isPending, isError } = useWorkspaceAvailability(workspaceId, date);

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
          <h2 className="text-base font-bold text-foreground">Availability</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Visual day timeline from {data?.openingHours.from ?? "…"} to{" "}
            {data?.openingHours.to ?? "…"}. Booked blocks are locked.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setDate((d) => shiftDate(d, -1))}
            disabled={date <= todayISO()}
            aria-label="Previous day"
            className="size-9 rounded-xl border-border/80 disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Input
            type="date"
            min={todayISO()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 w-36 rounded-xl border-border/80 bg-background text-center text-xs font-semibold"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setDate((d) => shiftDate(d, 1))}
            aria-label="Next day"
            className="size-9 rounded-xl border-border/80"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDate(todayISO())}
            className="ml-1 h-9 rounded-xl text-xs font-bold"
          >
            Today
          </Button>
        </div>
      </div>

      {isPending && <Skeleton className="mt-6 h-[300px] w-full rounded-xl" />}
      {isError && (
        <p className="mt-6 text-sm text-destructive">Could not load availability for this date.</p>
      )}

      {data && (
        <div className="mt-6 max-h-[460px] overflow-y-auto overflow-x-hidden rounded-xl border border-border/80 bg-background shadow-inner">
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

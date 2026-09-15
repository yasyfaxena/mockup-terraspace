import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  GripHorizontal,
  Loader2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useWorkspaceAvailability } from "../workspaces.queries";

const HOUR_HEIGHT_PX = 58;
const TOP_CLEARANCE_PX = 24;
// How finely the selection snaps while dragging (minutes).
const SNAP_MINUTES = 15;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function timeToMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.round(minutes));
  const h = Math.floor(clamped / 60) % 24;
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

type DragMode = "move" | "resize-start" | "resize-end";

interface DragState {
  mode: DragMode;
  pointerId: number;
  originY: number;
  originStart: number;
  originEnd: number;
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
 * is just `{ from, to }` HH:MM strings.
 */
export function AvailabilityCalendar({
  workspaceId,
  selectedDate: controlledDate,
  onDateChange,
  selectedStart,
  selectedEnd,
  onSelectSlot,
  minDurationMinutes = 30,
}: {
  workspaceId: string;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  selectedStart?: string;
  selectedEnd?: string;
  onSelectSlot?: (start: string, end: string) => void;
  /** Smallest allowed selection length while dragging/resizing, in minutes. */
  minDurationMinutes?: number;
}) {
  const [internalDate, setInternalDate] = useState(todayISO());
  const date = controlledDate ?? internalDate;
  const setDate = onDateChange ?? setInternalDate;
  const { data, isPending, isError, isFetching } = useWorkspaceAvailability(workspaceId, date);
  const [drag, setDrag] = useState<DragState | null>(null);

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

  const isSelectedDate = !controlledDate || controlledDate === date;
  const startMin = selectedStart ? timeToMinutes(selectedStart) : null;
  const endMin = selectedEnd ? timeToMinutes(selectedEnd) : null;
  const hasValidSelection =
    isSelectedDate &&
    startMin !== null &&
    endMin !== null &&
    endMin > startMin &&
    selectedStart !== undefined &&
    selectedEnd !== undefined;

  const selectionBlock = hasValidSelection ? blockPosition(selectedStart, selectedEnd) : null;

  const selectionConflict =
    hasValidSelection &&
    Boolean(
      data?.busy.some((block) => {
        const bStart = timeToMinutes(block.from);
        const bEnd = timeToMinutes(block.to);
        return startMin < bEnd && endMin > bStart;
      }),
    );

  const beginDrag = useCallback(
    (mode: DragMode) => (e: React.PointerEvent) => {
      if (!onSelectSlot || startMin === null || endMin === null) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setDrag({
        mode,
        pointerId: e.pointerId,
        originY: e.clientY,
        originStart: startMin,
        originEnd: endMin,
      });
    },
    [onSelectSlot, startMin, endMin],
  );

  useEffect(() => {
    if (!drag || !onSelectSlot) return;

    const snap = (value: number) => Math.round(value / SNAP_MINUTES) * SNAP_MINUTES;
    const clamp = (value: number) => Math.min(Math.max(value, openStart), openEnd);

    function handleMove(e: PointerEvent) {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const deltaMinutes = ((e.clientY - drag.originY) / HOUR_HEIGHT_PX) * 60;

      if (drag.mode === "move") {
        const duration = drag.originEnd - drag.originStart;
        let newStart = snap(drag.originStart + deltaMinutes);
        newStart = Math.min(Math.max(newStart, openStart), openEnd - duration);
        onSelectSlot?.(minutesToTime(newStart), minutesToTime(newStart + duration));
      } else if (drag.mode === "resize-start") {
        let newStart = clamp(snap(drag.originStart + deltaMinutes));
        newStart = Math.min(newStart, drag.originEnd - minDurationMinutes);
        onSelectSlot?.(minutesToTime(newStart), minutesToTime(drag.originEnd));
      } else {
        let newEnd = clamp(snap(drag.originEnd + deltaMinutes));
        newEnd = Math.max(newEnd, drag.originStart + minDurationMinutes);
        onSelectSlot?.(minutesToTime(drag.originStart), minutesToTime(newEnd));
      }
    }

    function endDrag(e: PointerEvent) {
      if (e.pointerId !== drag?.pointerId) return;
      setDrag(null);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [drag, onSelectSlot, openStart, openEnd, minDurationMinutes]);

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
                setDate(shiftDate(date, -1));
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
                setDate(shiftDate(date, 1));
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
              {hours.map((h) => {
                const slotStartStr = `${String(h % 24).padStart(2, "0")}:00`;
                const nextH = h + 1;
                const slotEndStr = `${String(nextH % 24).padStart(2, "0")}:00`;
                const isOccupied = data.busy.some((b) => {
                  const bStart = timeToMinutes(b.from);
                  const bEnd = timeToMinutes(b.to);
                  return h * 60 < bEnd && nextH * 60 > bStart;
                });

                return (
                  <div
                    key={h}
                    onClick={() => {
                      if (onSelectSlot && !isOccupied) {
                        onSelectSlot(slotStartStr, slotEndStr);
                      }
                    }}
                    className={cn(
                      "group absolute inset-x-0 border-t border-border/50 transition-colors",
                      onSelectSlot && !isOccupied && "cursor-pointer hover:bg-primary/[0.04]",
                    )}
                    style={{
                      top: `${(h * 60 - openStart) * (HOUR_HEIGHT_PX / 60) + TOP_CLEARANCE_PX}px`,
                      height: `${HOUR_HEIGHT_PX}px`,
                    }}
                    title={
                      isOccupied
                        ? `${slotStartStr} – ${slotEndStr} is booked`
                        : onSelectSlot
                          ? `Click to select ${slotStartStr} – ${slotEndStr}`
                          : undefined
                    }
                  >
                    {onSelectSlot && !isOccupied && (
                      <span className="pointer-events-none absolute left-3 top-1 select-none text-[10px] font-medium text-primary/60 opacity-0 transition-opacity group-hover:opacity-100">
                        Click to select {slotStartStr}
                      </span>
                    )}
                  </div>
                );
              })}

              {data.busy.length === 0 && !hasValidSelection && (
                <p className="absolute inset-x-4 top-6 text-xs font-medium text-success">
                  All slots free for this date.
                </p>
              )}

              {data.busy.map((block, index) => {
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
              })}

              {/* Real-time preview of current booking selection — draggable & resizable */}
              {hasValidSelection && selectionBlock && (
                <div
                  className={cn(
                    "group absolute inset-x-2 z-20 rounded-xl border-2 p-2.5 text-xs shadow-lg backdrop-blur-xs touch-none",
                    !drag && "transition-all duration-300 ease-out",
                    onSelectSlot && (drag?.mode === "move" ? "cursor-grabbing" : "cursor-grab"),
                    selectionConflict
                      ? "border-amber-500 bg-amber-500/15 text-amber-900 ring-2 ring-amber-500/30 dark:text-amber-200"
                      : "border-primary bg-primary/15 text-primary ring-2 ring-primary/40 shadow-primary/20",
                  )}
                  style={{
                    top: `${selectionBlock.top}px`,
                    height: `${selectionBlock.height}px`,
                  }}
                  onPointerDown={beginDrag("move")}
                >
                  {/* Top edge handle — drag to adjust start time */}
                  {onSelectSlot && (
                    <div
                      onPointerDown={beginDrag("resize-start")}
                      className="absolute inset-x-0 -top-1.5 flex h-3.5 cursor-ns-resize items-center justify-center"
                    >
                      <GripHorizontal className="size-3 rounded-sm bg-background/90 text-current opacity-0 shadow-xs transition-opacity group-hover:opacity-100" />
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-1.5 font-bold">
                    <div className="flex items-center gap-1.5">
                      {selectionConflict ? (
                        <XCircle className="size-3.5 shrink-0 text-amber-500" />
                      ) : (
                        <span className="relative flex size-2">
                          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex size-2 rounded-full bg-primary" />
                        </span>
                      )}
                      <span className="tracking-tight">
                        {selectionConflict ? "Slot Conflict" : "Your Selection"}
                      </span>
                    </div>
                    <span className="rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-mono font-bold shadow-xs">
                      {selectedStart} – {selectedEnd}
                    </span>
                  </div>

                  {selectionConflict ? (
                    <p className="mt-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                      Overlaps with an already booked slot. Please choose another time.
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[11px] opacity-90">
                      Drag the box to move it, or the top/bottom edge to resize · Bookable
                    </p>
                  )}

                  {/* Bottom edge handle — drag to adjust end time */}
                  {onSelectSlot && (
                    <div
                      onPointerDown={beginDrag("resize-end")}
                      className="absolute inset-x-0 -bottom-1.5 flex h-3.5 cursor-ns-resize items-center justify-center"
                    >
                      <GripHorizontal className="size-3 rounded-sm bg-background/90 text-current opacity-0 shadow-xs transition-opacity group-hover:opacity-100" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

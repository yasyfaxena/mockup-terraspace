import { createFileRoute } from "@tanstack/react-router";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AdminCalendarView,
  adminCalendarQueryOptions,
  useAdminCalendar,
} from "@/features/bookings";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
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

export const Route = createFileRoute("/admin/calendar")({
  loader: ({ context: { queryClient } }) => {
    const date = todayISO();
    return queryClient.ensureQueryData(adminCalendarQueryOptions({ from: date, to: date }));
  },
  component: AdminCalendarPage,
});

function AdminCalendarPage() {
  const [date, setDate] = useState(todayISO());
  const { data, isPending, isFetching } = useAdminCalendar({ from: date, to: date });
  const entries = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-white/35">Real workspace columns — no room-name matching.</p>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 items-center rounded-xl border border-white/[.12] bg-white/[.04] shadow-xs">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-white/70 hover:bg-white/[.08] hover:text-white disabled:pointer-events-none disabled:opacity-25"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDate((d) => shiftDate(d, -1));
              }}
              disabled={isFetching}
              aria-label="Previous day"
            >
              <ChevronLeft className="size-4" />
            </Button>

            <label
              onClick={(e) => e.stopPropagation()}
              className="relative flex h-full cursor-pointer items-center justify-center border-x border-white/[.1] px-3 text-xs font-semibold text-white transition-colors hover:bg-white/[.05]"
            >
              <CalendarIcon className="mr-1.5 size-3.5 text-white/50" />
              <span className="tabular-nums">{formatDisplayDate(date)}</span>
              <input
                type="date"
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
              className="size-8 rounded-lg text-white/70 hover:bg-white/[.08] hover:text-white disabled:pointer-events-none disabled:opacity-25"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDate((d) => shiftDate(d, 1));
              }}
              disabled={isFetching}
              aria-label="Next day"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl border-white/[.12] px-3 text-xs font-semibold text-white/90 hover:bg-white/[.06] disabled:opacity-30"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDate(todayISO());
            }}
            disabled={date === todayISO() || isFetching}
          >
            Today
          </Button>
        </div>
      </div>

      {isPending && !data ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : (
        <div className={isFetching ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <AdminCalendarView entries={entries} />
        </div>
      )}
    </div>
  );
}

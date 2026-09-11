import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export const Route = createFileRoute("/admin/calendar")({
  loader: ({ context: { queryClient } }) => {
    const date = todayISO();
    return queryClient.ensureQueryData(adminCalendarQueryOptions({ from: date, to: date }));
  },
  component: AdminCalendarPage,
});

function AdminCalendarPage() {
  const [date, setDate] = useState(todayISO());
  const { data, isPending } = useAdminCalendar({ from: date, to: date });
  const entries = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-white/35">Real workspace columns — no room-name matching.</p>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="size-9 border-white/[.1]"
            onClick={() => setDate((d) => shiftDate(d, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 w-36 border-white/[.1] bg-white/[.05] text-center text-xs text-white"
          />
          <Button
            variant="outline"
            size="icon"
            className="size-9 border-white/[.1]"
            onClick={() => setDate((d) => shiftDate(d, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-white/[.1]"
            onClick={() => setDate(todayISO())}
          >
            Today
          </Button>
        </div>
      </div>

      {isPending ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : (
        <AdminCalendarView entries={entries} />
      )}
    </div>
  );
}

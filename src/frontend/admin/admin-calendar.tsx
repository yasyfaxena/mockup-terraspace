import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Plus, X, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { formatUSD } from "@/frontend/data/catalog";
import { adminGetCalendarBookings } from "@/backend";

type CalendarBooking = Awaited<ReturnType<typeof adminGetCalendarBookings>>[number];

type CalView = "day" | "week" | "month";

const HOURS = Array.from({ length: 10 }, (_, i) => i + 8); // 8-17
const ROOM_COLORS = [
  "bg-[#6366f1]/30 border-[#6366f1]/50 text-[#a5b4fc]",
  "bg-[#0ea5e9]/25 border-[#0ea5e9]/40 text-[#7dd3fc]",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function weekStart(d: Date) {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  return r;
}
function monthDays(y: number, m: number) {
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const days: Date[] = [];
  const start = weekStart(first);
  let cur = new Date(start);
  while (cur <= last || days.length % 7 !== 0) {
    days.push(new Date(cur));
    cur = addDays(cur, 1);
    if (days.length > 42) break;
  }
  return days;
}

function timeToMin(t: string) {
  const [h = 0, m = 0] = t.split(":").map(Number);
  return h * 60 + m;
}

const HOUR_H = 56; // px per hour

export function AdminCalendar() {
  const { locale } = useI18n();
  const isId = locale === "id";
  const [view, setView] = useState<CalView>("week");
  const [anchor, setAnchor] = useState(new Date());
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [selected, setSelected] = useState<CalendarBooking | null>(null);

  useEffect(() => {
    adminGetCalendarBookings().then((data) => setBookings(data));
  }, []);

  // Navigate
  function nav(delta: number) {
    const d = new Date(anchor);
    if (view === "day") d.setDate(d.getDate() + delta);
    else if (view === "week") d.setDate(d.getDate() + delta * 7);
    else d.setMonth(d.getMonth() + delta);
    setAnchor(d);
  }

  // Header label
  const headerLabel = useMemo(() => {
    if (view === "day")
      return anchor.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    if (view === "week") {
      const ws = weekStart(anchor);
      const we = addDays(ws, 6);
      return `${ws.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", { month: "short", day: "numeric" })} – ${we.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return anchor.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
      month: "long",
      year: "numeric",
    });
  }, [view, anchor, locale]);

  // Days to show
  const days = useMemo(() => {
    if (view === "day") return [anchor];
    if (view === "week") return Array.from({ length: 7 }, (_, i) => addDays(weekStart(anchor), i));
    return monthDays(anchor.getFullYear(), anchor.getMonth());
  }, [view, anchor]);

  function bookingsForDate(date: Date) {
    return bookings.filter((b) => b.booking_date === isoDate(date));
  }

  const ROOMS = ["Room Borobudur", "Room Prambanan"];

  // DAY VIEW
  function DayView() {
    const dayBookings = bookingsForDate(anchor);
    return (
      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          {/* Column headers */}
          <div
            className="grid border-b border-white/[0.06]"
            style={{ gridTemplateColumns: "56px repeat(2, 1fr)" }}
          >
            <div />
            {ROOMS.map((r) => (
              <div
                key={r}
                className="px-3 py-2.5 border-l border-white/[0.05] text-xs font-semibold text-white/50 text-center"
              >
                {r}
              </div>
            ))}
          </div>
          {/* Time grid */}
          <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
            <div className="relative" style={{ height: HOURS.length * HOUR_H }}>
              {/* Hour lines + labels */}
              {HOURS.map((h, i) => (
                <div key={h} className="absolute left-0 right-0 flex" style={{ top: i * HOUR_H }}>
                  <div className="w-14 text-right pr-2 flex-shrink-0">
                    <span className="text-[10px] text-white/25">
                      {h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
                    </span>
                  </div>
                  <div className="flex-1 border-t border-white/[0.05]" />
                </div>
              ))}
              {/* Room columns */}
              {ROOMS.map((room, ri) => {
                const roomBooks = dayBookings.filter((b) =>
                  (b.workspace_name ?? "").includes(room.replace("Room ", "")),
                );
                const colLeft = `calc(56px + ${ri} * ((100% - 56px) / 2))`;
                const colW = `calc((100% - 56px) / 2)`;
                return (
                  <div
                    key={room}
                    className="absolute border-l border-white/[0.05]"
                    style={{ left: colLeft, width: colW, top: 0, bottom: 0 }}
                  >
                    {roomBooks.map((b, bi) => {
                      const sMin = timeToMin(b.start_time ?? "08:00");
                      const eMin = timeToMin(b.end_time ?? "09:00");
                      const top = ((sMin - 480) / 60) * HOUR_H + 2;
                      const height = ((eMin - sMin) / 60) * HOUR_H - 4;
                      if (top < 0 || height <= 0) return null;
                      return (
                        <button
                          key={bi}
                          onClick={() => setSelected(b)}
                          className={cn(
                            "absolute left-1 right-1 rounded-lg px-2 py-1 text-left overflow-hidden border",
                            ROOM_COLORS[ri % 2],
                          )}
                          style={{ top, height }}
                        >
                          <p className="text-[10px] font-bold truncate">
                            {b.start_time}–{b.end_time}
                          </p>
                          <p className="text-[9px] opacity-70 truncate capitalize">{b.status}</p>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // WEEK VIEW
  function WeekView() {
    return (
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div
            className="grid border-b border-white/[0.06]"
            style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}
          >
            <div />
            {days.map((d) => {
              const isToday = isoDate(d) === isoDate(new Date());
              return (
                <div
                  key={isoDate(d)}
                  className="px-1 py-2 border-l border-white/[0.05] text-center"
                >
                  <p className="text-[9px] text-white/30 uppercase">
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                  </p>
                  <p
                    className={cn(
                      "text-sm font-bold mt-0.5",
                      isToday ? "text-[#818cf8]" : "text-white/60",
                    )}
                  >
                    {d.getDate()}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 500 }}>
            <div className="relative" style={{ height: HOURS.length * HOUR_H }}>
              {HOURS.map((h, i) => (
                <div key={h} className="absolute left-0 right-0 flex" style={{ top: i * HOUR_H }}>
                  <div className="w-12 text-right pr-1.5 flex-shrink-0">
                    <span className="text-[9px] text-white/20">
                      {h < 12 ? `${h}AM` : h === 12 ? "12PM" : `${h - 12}PM`}
                    </span>
                  </div>
                  <div className="flex-1 border-t border-white/[0.05]" />
                </div>
              ))}
              {days.map((d, di) => {
                const dayBooks = bookingsForDate(d);
                const colW = `calc((100% - 48px) / 7)`;
                const colLeft = `calc(48px + ${di} * ((100% - 48px) / 7))`;
                return (
                  <div
                    key={isoDate(d)}
                    className="absolute border-l border-white/[0.04]"
                    style={{ left: colLeft, width: colW, top: 0, bottom: 0 }}
                  >
                    {dayBooks.map((b, bi) => {
                      const sMin = timeToMin(b.start_time ?? "08:00");
                      const eMin = timeToMin(b.end_time ?? "09:00");
                      const top = ((sMin - 480) / 60) * HOUR_H + 1;
                      const height = Math.max(((eMin - sMin) / 60) * HOUR_H - 2, 16);
                      if (top < 0) return null;
                      const ri = (b.workspace_name ?? "").includes("Prambanan") ? 1 : 0;
                      return (
                        <button
                          key={bi}
                          onClick={() => setSelected(b)}
                          className={cn(
                            "absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-left overflow-hidden border text-[9px] font-semibold",
                            ROOM_COLORS[ri],
                          )}
                          style={{ top, height }}
                        >
                          {b.start_time}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MONTH VIEW
  function MonthView() {
    return (
      <div>
        <div className="grid grid-cols-7 border-b border-white/[0.06]">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div
              key={d}
              className="py-2 text-center text-[10px] font-semibold text-white/25 uppercase"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const iso = isoDate(d);
            const isToday = iso === isoDate(new Date());
            const isCurrentMonth = d.getMonth() === anchor.getMonth();
            const dayBooks = bookingsForDate(d);
            return (
              <div
                key={iso}
                className={cn(
                  "min-h-[80px] border-b border-r border-white/[0.04] p-1.5",
                  !isCurrentMonth && "opacity-30",
                )}
              >
                <p
                  className={cn(
                    "text-xs font-bold mb-1 w-5 h-5 flex items-center justify-center rounded-full",
                    isToday ? "bg-[#6366f1] text-white" : "text-white/50",
                  )}
                >
                  {d.getDate()}
                </p>
                {dayBooks.slice(0, 2).map((b, i) => {
                  const ri = (b.workspace_name ?? "").includes("Prambanan") ? 1 : 0;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelected(b)}
                      className={cn(
                        "w-full text-left text-[9px] font-semibold px-1 py-0.5 rounded mb-0.5 truncate border",
                        ROOM_COLORS[ri],
                      )}
                    >
                      {b.start_time} {(b.workspace_name ?? "").replace("Room ", "")}
                    </button>
                  );
                })}
                {dayBooks.length > 2 && (
                  <p className="text-[9px] text-white/30">+{dayBooks.length - 2} more</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => nav(-1)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-white min-w-[200px] text-center">
            {headerLabel}
          </span>
          <button
            onClick={() => nav(1)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => setAnchor(new Date())}
          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all"
        >
          {isId ? "Hari Ini" : "Today"}
        </button>
        <div className="flex items-center gap-1 ml-auto bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.07]">
          {(["day", "week", "month"] as CalView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all",
                view === v
                  ? "bg-[#6366f1]/30 text-white border border-[#6366f1]/40"
                  : "text-white/40 hover:text-white",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        {[
          { name: "Room Borobudur", cls: "bg-[#6366f1]/40" },
          { name: "Room Prambanan", cls: "bg-[#0ea5e9]/40" },
        ].map((r) => (
          <div key={r.name} className="flex items-center gap-1.5 text-xs text-white/40">
            <span className={cn("w-2.5 h-2.5 rounded-sm", r.cls)} />
            {r.name}
          </div>
        ))}
      </div>

      {/* Calendar body */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
        {view === "day" && <DayView />}
        {view === "week" && <WeekView />}
        {view === "month" && <MonthView />}
      </div>

      {/* Booking detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#0d1224] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#818cf8]" />
                <h3 className="text-sm font-bold text-white">Booking Detail</h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-white/30 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Workspace", value: selected.workspace_name },
                { label: "Date", value: selected.booking_date },
                { label: "Time", value: `${selected.start_time} – ${selected.end_time}` },
                { label: "Status", value: selected.status },
                { label: "Total", value: formatUSD(selected.total_amount ?? 0) },
                { label: "Ref", value: selected.reference ?? "N/A" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex justify-between items-center py-1.5 border-b border-white/[0.05]"
                >
                  <span className="text-xs text-white/35">{label}</span>
                  <span className="text-xs font-semibold text-white capitalize">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

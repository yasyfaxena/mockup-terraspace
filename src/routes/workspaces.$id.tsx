import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  KeyRound,
  LogIn,
  MapPin,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { SiteShell } from "@/frontend/site/site-shell";
import { Button } from "@/frontend/ui/button";
import { Input } from "@/frontend/ui/input";
import { Label } from "@/frontend/ui/label";
import { AvailabilityBadge } from "@/frontend/site/availability-badge";
import { usePublicCatalog } from "@/frontend/data/catalog";
import { getBookingsForDate, getPublicCatalog } from "@/backend";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const HOURS = Array.from({ length: 10 }, (_, i) => 8 + i); // 08:00 (8 AM) → 17:00 (5 PM)
const hhmm = (h: number) => `${String(h).padStart(2, "0")}:00`;
const todayISO = () => new Date().toISOString().slice(0, 10);

export const Route = createFileRoute("/workspaces/$id")({
  loader: async ({ params }) => {
    const catalog = await getPublicCatalog();
    const workspace = catalog.workspaces.find((w) => w.id === params.id);
    if (!workspace) throw notFound();
    return { name: workspace.name, description: workspace.description };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Workspace unavailable — TerraSpace" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${loaderData.name} — TerraSpace`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.description },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.description },
      ],
    };
  },
  component: WorkspaceDetail,
});

interface BookedInterval {
  id: string;
  start: string;
  end: string;
  titleId: string;
  titleEn: string;
}

const timeToMinutes = (timeStr: string) => {
  const [h = 0, m = 0] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

const getBlockPosition = (startTime: string, endTime: string) => {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const baseMin = 8 * 60; // 08:00 AM
  const top = Math.max(0, ((startMin - baseMin) / 60) * 58) + 24;
  const height = Math.max(26, ((endMin - startMin) / 60) * 58);
  return { top, height };
};

function WorkspaceDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { t, locale, money, formatDuration } = useI18n();
  const { workspaces, locations } = usePublicCatalog();
  const workspace = workspaces.find((w) => w.id === id);
  const location = workspace
    ? locations.find((item) => item.slug === workspace.locationSlug)
    : undefined;

  // NOTE: all hooks below run unconditionally on every render (React's Rules of Hooks) —
  // the "workspace not loaded yet" case is handled with a render-time guard further down,
  // not an early return before these hooks.

  const [date, setDate] = useState(todayISO());
  const [start, setStart] = useState("11:00");
  const [end, setEnd] = useState("13:00");
  const [dbIntervals, setDbIntervals] = useState<BookedInterval[]>([]);
  const [nowTime, setNowTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNowTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real bookings specifically for the selected date
  useEffect(() => {
    if (!workspace) return;
    let active = true;
    async function fetchDateBookings() {
      try {
        const bookingRows = await getBookingsForDate({
          data: { workspaceId: workspace!.id, date },
        });

        if (!active) return;

        if (bookingRows && bookingRows.length > 0) {
          const mapped: BookedInterval[] = bookingRows.map((r, idx) => ({
            id: r.id ?? `db-${idx}`,
            start: r.start_time.slice(0, 5),
            end: r.end_time.slice(0, 5),
            titleId: "Sesi Reservasi Terkonfirmasi",
            titleEn: "Confirmed Booking Session",
          }));
          setDbIntervals(mapped);
        } else {
          setDbIntervals([]);
        }
      } catch {
        if (active) setDbIntervals([]);
      }
    }

    void fetchDateBookings();
    return () => {
      active = false;
    };
  }, [workspace?.id, date]);

  // Bookings are strictly specific to the selected date
  // Demo sample bookings are only attached to TODAY's date so tomorrow and other dates are clean/empty!
  const bookedIntervals = useMemo<BookedInterval[]>(() => {
    if (!workspace) return [];
    const isToday = date === todayISO();

    const demoDefaults: BookedInterval[] = isToday
      ? workspace.id === "ws-1"
        ? [
            {
              id: "demo-b1",
              start: "09:00",
              end: "10:30",
              titleId: "Sesi Rapat Tim Eksekutif",
              titleEn: "Executive Board Session",
            },
            {
              id: "demo-b2",
              start: "14:00",
              end: "15:30",
              titleId: "Presentasi Klien Korporat",
              titleEn: "Corporate Client Pitch",
            },
          ]
        : [
            {
              id: "demo-p1",
              start: "10:00",
              end: "12:00",
              titleId: "Workshop Desain & Sprint Produk",
              titleEn: "Product Design Workshop",
            },
            {
              id: "demo-p2",
              start: "15:00",
              end: "16:30",
              titleId: "Review Evaluasi & Tech Sync",
              titleEn: "Engineering Sprint Review",
            },
          ]
      : [];

    return [...demoDefaults, ...dbIntervals];
  }, [workspace, date, dbIntervals]);

  // Date Shift Helper (Prev Day / Next Day)
  const shiftDate = (days: number) => {
    const [y = 2026, m = 1, d = 1] = date.split("-").map(Number);
    const target = new Date(y, m - 1, d + days);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (target >= today) {
      const yStr = target.getFullYear();
      const mStr = String(target.getMonth() + 1).padStart(2, "0");
      const dStr = String(target.getDate()).padStart(2, "0");
      setDate(`${yStr}-${mStr}-${dStr}`);
    }
  };

  // Duration in minutes calculated from custom client start & end time
  const totalMinutes = useMemo(() => {
    if (!start || !end) return 0;
    const [sh = 0, sm = 0] = start.split(":").map(Number);
    const [eh = 0, em = 0] = end.split(":").map(Number);
    return eh * 60 + em - (sh * 60 + sm);
  }, [start, end]);

  const isValidTime = totalMinutes >= 30;
  const durationHours = Math.max(0.5, totalMinutes / 60);
  const total = Math.round((workspace?.price ?? 0) * durationHours);
  const bookable = workspace
    ? workspace.availability !== "full" && workspace.availability !== "unavailable"
    : false;

  // Check if client selected time overlaps with any booked block
  const hasOverlap = useMemo(() => {
    if (!isValidTime) return false;
    const userStart = timeToMinutes(start);
    const userEnd = timeToMinutes(end);

    return bookedIntervals.some((b) => {
      const bStart = timeToMinutes(b.start);
      const bEnd = timeToMinutes(b.end);
      return Math.max(userStart, bStart) < Math.min(userEnd, bEnd);
    });
  }, [start, end, isValidTime, bookedIntervals]);

  const isToday = date === todayISO();
  const currentTimeOffset = useMemo(() => {
    if (!isToday) return null;
    const nowMin = nowTime.getHours() * 60 + nowTime.getMinutes();
    const baseMin = 8 * 60; // 08:00
    const maxMin = 17 * 60; // 17:00
    if (nowMin < baseMin || nowMin > maxMin) return null;
    return ((nowMin - baseMin) / 60) * 58 + 24;
  }, [isToday, nowTime]);

  if (!workspace || !location) {
    return (
      <SiteShell>
        <div className="container-page py-24 text-center text-sm text-muted-foreground">
          {t("common.loading")}
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <section className="container-page py-8">
        <nav className="text-sm text-muted-foreground">
          <Link to="/workspaces" className="hover:text-foreground">
            {t("nav.workspaces")}
          </Link>
          <span className="px-2">/</span>
          <span className="text-foreground">{workspace.name}</span>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <div>
            <div className="overflow-hidden rounded-xl border border-border shadow-[var(--shadow-soft)]">
              <img
                src={workspace.image}
                alt={workspace.name}
                width={1200}
                height={800}
                className="h-[320px] w-full object-cover md:h-[420px]"
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {workspace.type}
              </span>
              <AvailabilityBadge status={workspace.availability} />
            </div>

            <h1 className="text-h1 mt-3">{workspace.name}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4 text-primary" /> {location.name} · {workspace.floor}
              </span>
            </p>
            <p className="mt-1 pl-6 text-xs text-muted-foreground">
              {location.address}, {location.city}
            </p>

            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              {workspace.description}
            </p>

            <h2 className="mt-9 text-h2">{t("detail.amenities")}</h2>
            <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {workspace.amenities.map((a) => (
                <div
                  key={a}
                  className="flex items-center gap-2.5 border-t border-border pt-3 text-sm"
                >
                  <ShieldCheck className="size-4 text-primary" /> {a}
                </div>
              ))}
            </div>

            {/* Google Calendar-Style Visual Availability Timeline */}
            <div className="mt-10 rounded-2xl border border-border/90 bg-card p-5 sm:p-6 shadow-[var(--shadow-soft)]">
              {/* Header & Date Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <CalendarDays className="size-4" />
                    </span>
                    <h2 className="text-base font-bold text-foreground">
                      {t("detail.availability")}
                    </h2>
                    {workspace.calendarSync === "google-preview" ? (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {locale === "id"
                          ? "Google Calendar · Pratinjau"
                          : "Google Calendar · Preview"}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("detail.availabilityHint")}
                    {workspace.calendarSync === "google-preview" ? (
                      <>
                        {" "}
                        {locale === "id"
                          ? "Ini masih tampilan pratinjau (data contoh) — sinkronisasi langsung dengan Google Calendar akan menyusul."
                          : "This is a UI preview with sample data — live Google Calendar sync is coming soon."}
                      </>
                    ) : null}
                  </p>
                </div>

                {/* Date Controls */}
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => shiftDate(-1)}
                    disabled={date <= todayISO()}
                    aria-label="Previous day"
                    className="size-9 rounded-xl border-border/80 hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Input
                    id="cal-date"
                    type="date"
                    min={todayISO()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-9 w-36 text-xs font-semibold border-border/80 bg-background rounded-xl text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => shiftDate(1)}
                    aria-label="Next day"
                    className="size-9 rounded-xl border-border/80 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDate(todayISO())}
                    className="h-9 rounded-xl text-xs font-bold border-border/80 hover:bg-primary/10 hover:text-primary transition-all ml-1 cursor-pointer"
                  >
                    {locale === "id" ? "Hari Ini" : "Today"}
                  </Button>
                </div>
              </div>

              {!session ? (
                <div className="mt-5 flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2.5">
                    <LogIn className="size-5 shrink-0 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {t("auth.loginToBookNotice")}
                    </span>
                  </div>
                  <Button asChild size="sm" className="bg-galaxy-accent shrink-0 font-bold">
                    <Link to="/login" search={{ redirect: `/workspaces/${workspace.id}` }}>
                      {t("cta.login")}
                    </Link>
                  </Button>
                </div>
              ) : null}

              {/* Google Calendar Canvas - Scrollable Container */}
              <div className="mt-6 rounded-xl border border-border/80 bg-background shadow-inner overflow-hidden">
                {/* Calendar Column Header */}
                <div className="grid grid-cols-[64px_1fr] border-b border-border/80 bg-muted/30">
                  <div className="flex items-center justify-center border-r border-border/80 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    GMT+07
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-extrabold text-primary border border-primary/30">
                        {new Date(date)
                          .toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
                            weekday: "short",
                          })
                          .toUpperCase()}
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {new Date(date).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {bookedIntervals.length === 0 ? (
                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-400">
                          {locale === "id"
                            ? "✨ Semua Jam Tersedia Penuh (08:00 – 17:00)"
                            : "✨ All Slots Available (08:00 – 17:00)"}
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-500/15 border border-red-500/30 px-2.5 py-0.5 text-[10px] font-extrabold text-red-400">
                          {locale === "id"
                            ? `🔒 ${bookedIntervals.length} Sesi Terisi`
                            : `🔒 ${bookedIntervals.length} Booked Slots`}
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-muted-foreground hidden sm:inline">
                        {workspace.name} · {location.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Scrollable Timeline Viewport (max-h-[460px] overflow-y-auto) */}
                <div className="max-h-[460px] overflow-y-auto overflow-x-hidden">
                  <div className="relative grid grid-cols-[64px_1fr] h-[590px] select-none">
                    {/* Left Time Column (8 AM to 5 PM with top clearance) */}
                    <div className="relative border-r border-border/80 bg-muted/10">
                      {HOURS.map((h) => {
                        const displayHour =
                          h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`;

                        return (
                          <div
                            key={h}
                            className="absolute right-2.5 -translate-y-1/2 text-[11px] font-mono font-bold text-muted-foreground/80"
                            style={{ top: `${(h - 8) * 58 + 24}px` }}
                          >
                            {displayHour}
                          </div>
                        );
                      })}
                    </div>

                    {/* Right Event Area with Horizontal Grid Lines */}
                    <div className="relative bg-card/20 overflow-hidden">
                      {/* Hourly Grid Lines */}
                      {HOURS.map((h) => (
                        <div
                          key={h}
                          className="absolute inset-x-0 border-t border-border/50"
                          style={{ top: `${(h - 8) * 58 + 24}px` }}
                        >
                          {/* Half-hour dotted line (for hours 8 to 16) */}
                          {h < 17 && (
                            <div className="absolute inset-x-0 top-[29px] border-t border-dashed border-border/20" />
                          )}
                        </div>
                      ))}

                      {/* Booked / Unavailable Event Blocks */}
                      {bookedIntervals.map((block) => {
                        const { top, height } = getBlockPosition(block.start, block.end);
                        const title = locale === "id" ? block.titleId : block.titleEn;

                        return (
                          <div
                            key={block.id}
                            className="absolute inset-x-2 z-10 overflow-hidden rounded-lg border-l-4 border-l-red-500 border border-red-500/40 bg-gradient-to-r from-red-950/40 via-red-900/20 to-red-950/30 p-2 text-xs shadow-md transition-all backdrop-blur-[2px]"
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                              backgroundImage:
                                "repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.05) 0, rgba(239, 68, 68, 0.05) 10px, transparent 10px, transparent 20px)",
                            }}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 font-bold text-red-300">
                                  <XCircle className="size-3.5 shrink-0 text-red-400" />
                                  <span className="truncate">{title}</span>
                                </div>
                                <div className="mt-0.5 text-[11px] font-mono text-red-300/80">
                                  {block.start} – {block.end}
                                </div>
                              </div>
                              <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300 border border-red-500/30 uppercase tracking-wider">
                                {t("detail.booked")}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {/* User Selection Live Preview Block */}
                      {isValidTime &&
                        (() => {
                          const { top, height } = getBlockPosition(start, end);
                          return (
                            <div
                              className={`absolute inset-x-2 z-20 overflow-hidden rounded-lg border-l-4 p-2 text-xs shadow-lg transition-all animate-in fade-in zoom-in-95 duration-200 ${
                                hasOverlap
                                  ? "border-l-amber-500 border border-amber-500/60 bg-amber-950/60 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                                  : "border-l-primary border border-primary/70 bg-primary/20 text-foreground backdrop-blur-sm shadow-[0_0_25px_rgba(56,189,248,0.3)]"
                              }`}
                              style={{
                                top: `${top}px`,
                                height: `${height}px`,
                              }}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 font-extrabold text-foreground">
                                    {hasOverlap ? (
                                      <XCircle className="size-3.5 text-amber-400 shrink-0" />
                                    ) : (
                                      <Sparkles className="size-3.5 text-primary shrink-0 animate-pulse" />
                                    )}
                                    <span className="truncate">
                                      {hasOverlap
                                        ? locale === "id"
                                          ? "⚠️ Jadwal Bertabrakan!"
                                          : "⚠️ Time Conflict!"
                                        : t("detail.yourSelection")}
                                    </span>
                                  </div>
                                  <div className="mt-0.5 text-[11px] font-mono font-bold text-primary">
                                    {start} – {end} ({formatDuration(totalMinutes)})
                                  </div>
                                </div>
                                <span
                                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${
                                    hasOverlap
                                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                      : "bg-primary/30 text-primary border-primary/50"
                                  }`}
                                >
                                  {hasOverlap ? t("detail.overlapBadge") : t("detail.selected")}
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                      {/* Current Time Red Indicator Line */}
                      {isToday && currentTimeOffset !== null && (
                        <div
                          className="absolute inset-x-0 z-30 flex items-center pointer-events-none"
                          style={{ top: `${currentTimeOffset}px` }}
                        >
                          <div className="size-2.5 rounded-full bg-red-500 -ml-1.5 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                          <div className="h-[2px] w-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Calendar Legend */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-4 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="size-3 rounded bg-red-500/20 border border-red-500/40" />
                    {t("detail.booked")} (Terkunci)
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="size-3 rounded bg-primary/25 border border-primary/50" />
                    {t("detail.yourSelection")}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="size-3 rounded bg-card border border-border" />
                    {t("detail.free")} (08:00 – 17:00)
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">* GMT+07 (WIB)</span>
              </div>
            </div>

            <div className="mt-9 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="size-4 text-primary" /> {t("detail.cancellation")}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{workspace.cancellation}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <KeyRound className="size-4 text-primary" /> {t("detail.accessInfo")}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{t("detail.accessDesc")}</p>
              </div>
            </div>
          </div>

          {/* Sidebar Booking Form with Client Custom Start & End Time Input */}
          <aside className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-lift)] lg:sticky lg:top-24">
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="text-3xl font-bold text-foreground">{money(workspace.price)}</span>{" "}
                / {t("common.hour")}
              </p>
              <AvailabilityBadge status={workspace.availability} />
            </div>

            <div className="mt-6 grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="b-date" className="text-xs font-semibold text-muted-foreground">
                  {t("detail.date")}
                </Label>
                <Input
                  id="b-date"
                  type="date"
                  min={todayISO()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="b-start" className="text-xs font-semibold text-muted-foreground">
                    {t("detail.startTime")}
                  </Label>
                  <Input
                    id="b-start"
                    type="time"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="b-end" className="text-xs font-semibold text-muted-foreground">
                    {t("detail.endTime")}
                  </Label>
                  <Input
                    id="b-end"
                    type="time"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Info className="size-3 text-primary shrink-0" />
                {t("detail.customTimeHint")}
              </p>
            </div>

            {/* Price & Duration Calculation Breakdown */}
            <dl className="mt-6 space-y-2.5 border-t border-border pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("detail.duration")}</dt>
                <dd className="font-semibold text-foreground">
                  {isValidTime ? formatDuration(totalMinutes) : "—"}
                </dd>
              </div>
              <div className="flex justify-between text-base font-bold">
                <dt>{t("detail.estTotal")}</dt>
                <dd className="text-primary">{isValidTime ? money(total) : "—"}</dd>
              </div>
            </dl>

            {!isValidTime && (
              <p className="mt-3 rounded-lg bg-destructive/10 p-2.5 text-center text-xs text-destructive">
                {t("detail.invalidTime")}
              </p>
            )}

            {hasOverlap && (
              <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-center text-xs font-bold text-destructive">
                {t("detail.overlapError")}
              </p>
            )}

            <Button
              size="lg"
              className="mt-5 w-full bg-galaxy-accent font-semibold"
              disabled={!bookable || !isValidTime || hasOverlap}
              onClick={() => {
                if (!session) {
                  navigate({ to: "/login", search: { redirect: `/workspaces/${workspace.id}` } });
                  return;
                }
                const booking = { workspace: workspace.id, date, start, end };
                navigate({ to: "/booking/review", search: booking });
              }}
            >
              {!bookable
                ? "Fully booked"
                : !session
                  ? t("cta.loginToBook")
                  : hasOverlap
                    ? t("detail.overlapBadge")
                    : !isValidTime
                      ? t("detail.selectSlot")
                      : t("cta.bookNow")}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {session
                ? "You will review full details and tax before paying."
                : t("auth.loginToBookNotice")}
            </p>
          </aside>
        </div>
      </section>
    </SiteShell>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  KeyRound,
  Lock,
  MapPin,
  QrCode,
  ShieldCheck,
  Unlock,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { SiteShell, PageHeader } from "@/frontend/site/site-shell";
import { Button } from "@/frontend/ui/button";
import { QrPass } from "@/frontend/site/qr-pass";
import { getUserBookings, cancelBooking } from "@/backend";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePublicCatalog } from "@/frontend/data/catalog";
import { APP_CONFIG } from "@/shared/constants";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My account — TerraSpace" },
      {
        name: "description",
        content: "Manage your TerraSpace bookings, access passes and smart door access.",
      },
      { property: "og:title", content: "My account — TerraSpace" },
      { property: "og:description", content: "Your bookings, QR passes and smart door access." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

type BookingRow = {
  id: string;
  workspace_id: string;
  workspace_name: string;
  location_slug: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_amount: number;
  status: string;
  reference: string;
  access_code: string;
  method?: string;
};

// Calculate Haversine distance in meters
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function playUnlockChime() {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // ignore
  }
}

function shiftTime(hhmm: string, deltaMinutes: number) {
  const [h = 0, m = 0] = (hhmm || APP_CONFIG.defaultBookingStart).split(":").map(Number);
  const total = (((h * 60 + m + deltaMinutes) % 1440) + 1440) % 1440;
  const rh = Math.floor(total / 60);
  const rm = total % 60;
  return `${String(rh).padStart(2, "0")}:${String(rm).padStart(2, "0")}`;
}

function DashboardPage() {
  const { session, profile, loading } = useAuth();
  const { t, money, formatDuration } = useI18n();
  const navigate = useNavigate();
  const { locations, workspaces } = usePublicCatalog();
  const [rows, setRows] = useState<BookingRow[] | null>(null);

  // Door Access states
  const [openPass, setOpenPass] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [unlockedState, setUnlockedState] = useState<{ id: string; countdown: number } | null>(
    null,
  );
  const [doorDistances, setDoorDistances] = useState<
    Record<string, { distance: number; inRadius: boolean }>
  >({});

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login", replace: true });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    void getUserBookings()
      .then((data) => {
        if (active) setRows((data as BookingRow[]) ?? []);
      })
      .catch(() => {
        if (active) setRows([]);
      });
    return () => {
      active = false;
    };
  }, [session]);

  // Handle Door Unlock Countdown
  useEffect(() => {
    if (!unlockedState) return;
    if (unlockedState.countdown <= 0) {
      setUnlockedState(null);
      return;
    }
    const timer = setInterval(() => {
      setUnlockedState((prev) => (prev ? { ...prev, countdown: prev.countdown - 1 } : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [unlockedState]);

  const today = new Date().toISOString().slice(0, 10);
  const { upcoming, past } = useMemo(() => {
    const list = rows ?? [];
    return {
      upcoming: list.filter((b) => b.booking_date >= today && b.status === "confirmed"),
      past: list.filter((b) => b.booking_date < today || b.status !== "confirmed"),
    };
  }, [rows, today]);

  const cancel = async (id: string) => {
    try {
      await cancelBooking({ data: { id } });
      setRows(
        (prev) => prev?.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)) ?? null,
      );
      toast.success(t("dash.cancelled"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    }
  };

  // Smart Door Access Unlock handler with Geolocation
  const handleUnlockDoor = async (b: BookingRow) => {
    const location = locations.find((item) => item.slug === b.location_slug);
    if (!location?.latitude || !location.longitude) {
      toast.error(t("dash.locationNotConfigured"));
      return;
    }
    const targetLat = location.latitude;
    const targetLng = location.longitude;

    setUnlockingId(b.id);

    // Real HTML5 Geolocation check
    if (!navigator.geolocation) {
      setUnlockingId(null);
      toast.error("Geolocation is not supported by your device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUnlockingId(null);
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        const dist = getDistanceFromLatLonInMeters(userLat, userLng, targetLat, targetLng);
        const inRadius = dist <= location.accessRadiusMeters;

        setDoorDistances((prev) => ({
          ...prev,
          [b.id]: { distance: dist, inRadius },
        }));

        if (inRadius) {
          playUnlockChime();
          setUnlockedState({ id: b.id, countdown: 10 });
          toast.success(t("dash.doorUnlocked"));
        } else {
          const distStr = dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${dist} m`;
          toast.error(t("dash.outOfRadius", { dist: distStr }));
        }
      },
      (err) => {
        setUnlockingId(null);
        toast.error(`Location check error: ${err.message}.`);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  if (!session) {
    return (
      <SiteShell>
        <div className="container-page py-24 text-center text-sm text-muted-foreground">
          {t("common.loading")}
        </div>
      </SiteShell>
    );
  }

  const renderBooking = (b: BookingRow) => {
    const location = locations.find((item) => item.slug === b.location_slug);
    const workspace = workspaces.find((item) => item.id === b.workspace_id);
    const isUnlocked = unlockedState?.id === b.id;
    const isUnlocking = unlockingId === b.id;
    const distanceInfo = doorDistances[b.id];
    const isExpanded = !!expandedDetails[b.id];

    // Compute duration in minutes
    const [sh = 0, sm = 0] = (b.start_time || APP_CONFIG.defaultBookingStart)
      .split(":")
      .map(Number);
    const [eh = 0, em = 0] = (b.end_time || APP_CONFIG.defaultBookingEnd).split(":").map(Number);
    const durationMinutes = Math.max(30, eh * 60 + em - (sh * 60 + sm));

    const accessFrom = shiftTime(b.start_time, -APP_CONFIG.bookingAccessBufferMinutes);
    const accessTo = shiftTime(b.end_time, APP_CONFIG.bookingAccessBufferMinutes);

    return (
      <article
        key={b.id}
        className="hover-glow overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition-all"
      >
        {/* Top Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/80 pb-5">
          <div className="flex items-start gap-4">
            {workspace?.image && (
              <img
                src={workspace.image}
                alt={b.workspace_name}
                className="size-16 rounded-xl object-cover border border-border"
              />
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">{b.workspace_name}</h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    b.status === "cancelled"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-success/15 text-success"
                  }`}
                >
                  {b.status === "cancelled" ? t("dash.cancelled") : t("dash.confirmed")}
                </span>
              </div>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5 text-primary" /> {location?.name ?? b.location_slug} ·{" "}
                  {workspace?.floor ?? "Level 18"}
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="size-3.5 text-primary" /> {location?.address}
                </span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-lg font-bold text-foreground">{money(Number(b.total_amount))}</p>
            <p className="font-mono text-xs font-medium text-muted-foreground">{b.reference}</p>
          </div>
        </div>

        {/* Booking Parameters Grid */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 rounded-xl bg-surface/70 p-4 text-xs">
          <div>
            <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">
              {t("detail.date")}
            </span>
            <p className="mt-1 font-semibold text-foreground flex items-center gap-1.5">
              <CalendarDays className="size-3.5 text-primary" /> {b.booking_date}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">
              {t("detail.startTime")} & {t("detail.endTime")}
            </span>
            <p className="mt-1 font-semibold text-foreground flex items-center gap-1.5">
              <Clock className="size-3.5 text-primary" /> {b.start_time} – {b.end_time} (
              {formatDuration(durationMinutes)})
            </p>
          </div>
          <div>
            <span className="text-muted-foreground uppercase tracking-wider font-semibold text-[10px]">
              {t("dash.method")}
            </span>
            <p className="mt-1 font-semibold text-foreground flex items-center gap-1.5 capitalize">
              <CreditCard className="size-3.5 text-primary" /> {b.method ?? "Credit card"}
            </p>
          </div>
        </div>

        {/* Dual Access Control: QR Pass & Smart Door Unlock */}
        {b.status !== "cancelled" && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border/80 pt-5">
            <div className="flex flex-wrap items-center gap-3">
              {/* Access Method 1: QR Pass */}
              <Button
                size="sm"
                variant={openPass === b.id ? "default" : "outline"}
                className="gap-2 font-medium"
                onClick={() => setOpenPass(openPass === b.id ? null : b.id)}
              >
                <QrCode className="size-4" />
                {openPass === b.id ? t("dash.closePass") : t("dash.viewPass")}
              </Button>

              {/* Access Method 2: Smart Door Unlock Button */}
              <Button
                size="sm"
                className={`gap-2 font-semibold transition-all ${
                  isUnlocked
                    ? "bg-success text-success-foreground shadow-lg shadow-success/30"
                    : "bg-galaxy-accent text-primary-foreground"
                }`}
                disabled={isUnlocking}
                onClick={() => void handleUnlockDoor(b)}
              >
                {isUnlocking ? (
                  <>
                    <KeyRound className="size-4 animate-spin" /> {t("dash.unlocking")}
                  </>
                ) : isUnlocked ? (
                  <>
                    <Unlock className="size-4 animate-bounce" /> {t("dash.doorUnlocked")} (
                    {unlockedState.countdown}s)
                  </>
                ) : (
                  <>
                    <Lock className="size-4" /> {t("dash.openDoor")}
                  </>
                )}
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground"
                onClick={() => setExpandedDetails((prev) => ({ ...prev, [b.id]: !prev[b.id] }))}
              >
                {isExpanded ? t("dash.viewDetails") : t("dash.viewDetails")}
              </Button>
            </div>

            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-destructive hover:bg-destructive/10"
              onClick={() => void cancel(b.id)}
            >
              {t("dash.cancel")}
            </Button>
          </div>
        )}

        {/* Door Unlocked Active Banner */}
        {isUnlocked && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-success/30 bg-success/15 p-4 text-xs text-success animate-pulse">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="size-5 shrink-0" />
              <span className="font-bold text-sm">
                Door Unlocked! Entrance & Room Access Active (Closing in {unlockedState.countdown}s)
              </span>
            </div>
            <span className="font-mono text-base font-bold">{unlockedState.countdown}s</span>
          </div>
        )}

        {/* Geolocation Radius Distance feedback */}
        {distanceInfo && !isUnlocked && (
          <div
            className={`mt-4 rounded-xl p-3 text-xs flex items-center justify-between ${
              distanceInfo.inRadius
                ? "border border-success/25 bg-success/10 text-success"
                : "border border-warning/25 bg-warning/10 text-warning-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <MapPin className="size-4" />
              <span>
                {distanceInfo.inRadius
                  ? t("dash.inRadius", { dist: `${distanceInfo.distance}m` })
                  : t("dash.outOfRadius", {
                      dist:
                        distanceInfo.distance >= 1000
                          ? `${(distanceInfo.distance / 1000).toFixed(1)} km`
                          : `${distanceInfo.distance} m`,
                    })}
              </span>
            </div>
          </div>
        )}

        {/* Expanded QR Pass Modal/Card */}
        {openPass === b.id ? (
          <div className="mt-5 flex flex-col items-center gap-4 rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/10 to-transparent p-6 text-center shadow-[var(--shadow-lift)]">
            <div className="flex items-center gap-2">
              <QrCode className="size-5 text-primary" />
              <h4 className="text-base font-bold text-foreground">{t("book.qrTitle")}</h4>
            </div>
            <div className="rounded-xl bg-white p-3 shadow-md">
              <QrPass value={b.access_code} size={220} />
            </div>
            <p className="font-mono text-xs font-semibold text-primary">{b.reference}</p>
            <p className="max-w-md text-xs text-muted-foreground">{t("book.qrHint")}</p>
          </div>
        ) : null}

        {/* Expanded Full Details & Amenities */}
        {isExpanded && (
          <div className="mt-5 space-y-4 rounded-2xl border border-border bg-surface/50 p-5 text-xs">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              {t("dash.viewDetails")}
            </h4>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-card p-3 border border-border">
                <span className="text-muted-foreground font-semibold">
                  {t("dash.accessWindow")}
                </span>
                <p className="mt-1 font-medium text-foreground">
                  {b.booking_date} · {accessFrom} – {accessTo}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Valid from 30 minutes prior until 30 minutes after booking.
                </p>
              </div>

              <div className="rounded-lg bg-card p-3 border border-border">
                <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Wifi className="size-3.5 text-primary" /> {t("dash.wifiAccess")}
                </span>
                <p className="mt-1 font-mono font-medium text-foreground">
                  SSID: TerraSpace_Guest_5G
                </p>
                <p className="text-[11px] font-mono text-muted-foreground">
                  {t("dash.wifiPass")}: TerraSpaceVIP2026
                </p>
              </div>
            </div>

            {workspace?.amenities && (
              <div>
                <span className="text-muted-foreground font-semibold block mb-2">
                  {t("dash.amenitiesIncluded")}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {workspace.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                    >
                      ✓ {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </article>
    );
  };

  return (
    <SiteShell>
      <PageHeader
        eyebrow={profile?.company ?? session.user.email ?? ""}
        title={`${t("dash.title")}${profile?.full_name ? ` — ${profile.full_name}` : ""}`}
        description={t("dash.bookings")}
      ></PageHeader>

      <section className="container-page grid gap-10 py-10">
        <div>
          <h2 className="text-h2 font-bold">{t("dash.upcoming")}</h2>
          <div className="mt-5 grid gap-5">
            {rows === null ? (
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : upcoming.length ? (
              upcoming.map(renderBooking)
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
                <CalendarDays className="mx-auto size-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">{t("dash.empty")}</p>
                <Button asChild className="mt-5 bg-galaxy-accent font-semibold">
                  <Link to="/workspaces">{t("cta.book")}</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {past.length ? (
          <div>
            <h2 className="text-h2 font-bold">{t("dash.past")}</h2>
            <div className="mt-5 grid gap-5 opacity-85">{past.map(renderBooking)}</div>
          </div>
        ) : null}
      </section>
    </SiteShell>
  );
}

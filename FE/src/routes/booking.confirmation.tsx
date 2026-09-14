import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { Calendar, CheckCircle2, Clock, ExternalLink, Loader2, MapPin, Wifi } from "lucide-react";
import { toast } from "sonner";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { requireAuth } from "@/features/auth";
import {
  bookingDetailQueryOptions,
  createGoogleCalendarUrl,
  QrPass,
  useBooking,
  useSyncGoogleCalendar,
} from "@/features/bookings";
import { paymentStatusQueryOptions, PaymentStatusPoller } from "@/features/payments";
import { formatMoney } from "@/shared/format";

const confirmationSearchSchema = z.object({ reference: z.string() });

export const Route = createFileRoute("/booking/confirmation")({
  validateSearch: confirmationSearchSchema,
  beforeLoad: () => requireAuth(),
  loaderDeps: ({ search }) => ({ reference: search.reference }),
  loader: async ({ context: { queryClient }, deps }) => {
    try {
      await queryClient.ensureQueryData(bookingDetailQueryOptions(deps.reference));
    } catch (error) {
      if (error instanceof ApiError && error.code === "NOT_FOUND") throw notFound();
      throw error;
    }
    // Best-effort: a booking can genuinely have no payment yet (the
    // customer bookmarked this URL before finishing checkout) — that 404
    // shouldn't block the rest of the page, only the poller has nothing
    // to show client-side.
    await queryClient
      .ensureQueryData(paymentStatusQueryOptions(deps.reference))
      .catch(() => undefined);
  },
  component: BookingConfirmationPage,
});

function BookingConfirmationPage() {
  const { reference } = Route.useSearch();
  const { data: booking, isPending } = useBooking(reference);
  const syncMutation = useSyncGoogleCalendar();
  const [syncedUrl, setSyncedUrl] = useState<string | null>(null);

  const handleSyncGoogle = () => {
    if (!booking) return;
    syncMutation.mutate(booking.reference, {
      onSuccess: (data) => {
        if (data.synced && data.htmlLink) {
          setSyncedUrl(data.htmlLink);
          toast.success("Successfully synced to your Google Calendar!");
        } else if (data.reason === "NO_GOOGLE_ACCOUNT") {
          toast.error(
            "Google account not connected or calendar permission not granted. Use the direct link below.",
          );
        } else {
          toast.error(data.error || "Failed to sync to Google Calendar.");
        }
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to sync to Google Calendar");
      },
    });
  };

  if (isPending || !booking) {
    return (
      <SiteShell>
        <div className="container-page space-y-4 py-10">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <section className="container-page max-w-2xl py-10">
        <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-5">
          <CheckCircle2 className="size-6 shrink-0 text-success" />
          <div>
            <h1 className="text-lg font-bold text-foreground">Booking confirmed</h1>
            <p className="text-sm text-muted-foreground">
              Reference <span className="font-mono font-semibold">{booking.reference}</span>
            </p>
          </div>
        </div>

        <div className="mt-4">
          <PaymentStatusPoller bookingId={booking.id} reference={booking.reference} />
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-[220px_1fr]">
          <div className="flex flex-col items-center gap-2">
            <QrPass value={booking.accessCode} />
            <p className="text-center text-[11px] text-muted-foreground">
              Scan at the entrance or workspace door.
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <MapPin className="size-4 text-primary" /> {booking.workspace.name}
            </div>
            <p className="pl-6 text-xs text-muted-foreground">
              {booking.workspace.location.address}, {booking.workspace.location.city}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="size-3.5 text-primary" />
              {booking.bookingDate} · {booking.startTime} – {booking.endTime}
            </div>
            {booking.accessWindow && (
              <p className="pl-6 text-[11px] text-muted-foreground">
                Access opens {new Date(booking.accessWindow.from).toLocaleTimeString()}, closes{" "}
                {new Date(booking.accessWindow.until).toLocaleTimeString()}.
              </p>
            )}
            <div className="flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <Wifi className="size-3.5 text-primary" /> High-speed Wi-Fi included.
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-foreground">{formatMoney(booking.totalAmount)}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button asChild className="bg-galaxy-accent font-semibold">
            <Link to="/dashboard">Go to my bookings</Link>
          </Button>

          {syncedUrl ? (
            <a
              href={syncedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-xs font-semibold text-emerald-400 shadow-xs transition-all hover:bg-emerald-500/20"
            >
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              Open in Google Calendar
              <ExternalLink className="size-3 text-emerald-400/80" />
            </a>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={syncMutation.isPending}
              onClick={handleSyncGoogle}
              className="gap-2 rounded-xl text-xs font-semibold"
            >
              {syncMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin text-primary" />
              ) : (
                <Calendar className="size-3.5 text-primary" />
              )}
              {syncMutation.isPending ? "Syncing..." : "Sync with Google Calendar"}
            </Button>
          )}

          <a
            href={createGoogleCalendarUrl({
              title: `TerraSpace: ${booking.workspace.name}`,
              description: `Booking Reference: ${booking.reference}\nWorkspace: ${booking.workspace.name}\nDoor Access Code: ${booking.accessCode}\n\nManaged via TerraSpace.`,
              location: `${booking.workspace.location.address}, ${booking.workspace.location.city}`,
              bookingDate: booking.bookingDate,
              startTime: booking.startTime,
              endTime: booking.endTime,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-muted-foreground shadow-xs transition-all hover:border-primary/50 hover:bg-muted/40 hover:text-foreground"
            title="Open Google Calendar web event creation form"
          >
            <ExternalLink className="size-3.5 text-muted-foreground" />
            Direct Web Link
          </a>

          <Button asChild variant="outline">
            <Link to="/workspaces">Book another space</Link>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}

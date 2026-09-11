import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { AlertTriangle, MapPin } from "lucide-react";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { requireAuth } from "@/features/auth";
import { useBookingPrice, useCreateBooking } from "@/features/bookings";
import { workspaceDetailQueryOptions, useWorkspace } from "@/features/workspaces";
import { queryKeys } from "@/shared/query-keys";
import { formatMoney } from "@/shared/format";

const reviewSearchSchema = z.object({
  workspaceId: z.string(),
  date: z.string(),
  start: z.string(),
  end: z.string(),
});

export const Route = createFileRoute("/booking/review")({
  validateSearch: reviewSearchSchema,
  beforeLoad: () => requireAuth(),
  loaderDeps: ({ search }) => ({ workspaceId: search.workspaceId }),
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureQueryData(workspaceDetailQueryOptions(deps.workspaceId)),
  component: BookingReviewPage,
});

function BookingReviewPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: workspace, isPending } = useWorkspace(search.workspaceId);
  const createBooking = useCreateBooking();
  const [agreed, setAgreed] = useState(false);
  const [conflict, setConflict] = useState(false);

  const price = useBookingPrice({
    startTime: search.start,
    endTime: search.end,
    unitPrice: workspace?.pricing.pricePerHour ?? "0",
    taxPercent: workspace?.pricing.taxPercent ?? "0",
  });

  async function handleConfirm() {
    setConflict(false);
    try {
      const booking = await createBooking.mutateAsync({
        workspaceId: search.workspaceId,
        bookingDate: search.date,
        startTime: search.start,
        endTime: search.end,
      });
      await navigate({ to: "/booking/confirmation", search: { reference: booking.reference } });
    } catch (error) {
      // The real message ("This time slot was just booked.") already shows
      // via the query-client's global toast handler — this just re-fetches
      // availability so the workspace page reflects the real conflict
      // instead of stale free/busy data (development-phases.md Phase 5).
      if (error instanceof ApiError && error.code === "BOOKING_SLOT_TAKEN") {
        setConflict(true);
        void queryClient.invalidateQueries({
          queryKey: queryKeys.workspaces.availability(search.workspaceId, search.date),
        });
      }
    }
  }

  if (isPending || !workspace) {
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
      <section className="container-page py-8">
        <h1 className="text-h1">Review your booking</h1>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-sm font-bold text-foreground">Booking details</h2>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Workspace</dt>
                <dd className="font-medium text-foreground">{workspace.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Location</dt>
                <dd className="flex items-center gap-1 font-medium text-foreground">
                  <MapPin className="size-3.5 text-primary" /> {workspace.location.name}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Date</dt>
                <dd className="font-medium text-foreground">{search.date}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Time</dt>
                <dd className="font-medium text-foreground">
                  {search.start} – {search.end} ({price.durationHours}h)
                </dd>
              </div>
            </dl>

            {conflict && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  This time slot was just booked by someone else.{" "}
                  <Link
                    to="/workspaces/$id"
                    params={{ id: workspace.id }}
                    className="font-semibold underline"
                  >
                    Pick another time
                  </Link>
                  .
                </span>
              </div>
            )}

            <label className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
              <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(Boolean(v))} />I agree to
              the cancellation policy: {workspace.cancellationPolicy || "standard terms"}
            </label>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] lg:sticky lg:top-24">
            <h2 className="text-sm font-bold text-foreground">Price summary</h2>
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatMoney(price.subtotalAmount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>{formatMoney(price.taxAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground">
                <span>Total</span>
                <span>{formatMoney(price.totalAmount)}</span>
              </div>
            </div>

            <Button
              className="mt-5 w-full bg-galaxy-accent font-semibold"
              disabled={!agreed || createBooking.isPending}
              onClick={() => void handleConfirm()}
            >
              {createBooking.isPending ? "Processing…" : "Confirm & book"}
            </Button>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Payment happens on the next step. Your smart access credential activates once payment
              is confirmed.
            </p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

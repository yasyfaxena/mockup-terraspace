import { Link } from "@tanstack/react-router";
import { Building2, CalendarDays, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/shared/format";
import type { BookingListItemDto } from "../bookings.types";

const STATUS_STYLES: Record<BookingListItemDto["status"], string> = {
  pending: "bg-warning/18 text-warning-foreground border-warning/40",
  confirmed: "bg-success/12 text-success border-success/25",
  cancelled: "bg-muted text-muted-foreground border-border",
  completed: "bg-primary/10 text-primary border-primary/25",
};

/**
 * `cancellationCutoff` is computed by the caller in the **browser's** local
 * timezone, not the venue's real IANA timezone — the booking DTOs don't
 * expose the workspace's location timezone, only its city name. Display
 * only, and can be off by an hour or two for a venue in a different
 * Indonesian timezone than the viewer; the server's `canCancel`/403 is
 * still what actually gates the action (development-phases.md Phase 5).
 */
export function BookingCard({
  booking,
  cancellationCutoff,
  onCancel,
}: {
  booking: BookingListItemDto;
  cancellationCutoff: Date | null;
  onCancel: (booking: BookingListItemDto) => void;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center">
      {booking.workspace.imageUrl ? (
        <img
          src={booking.workspace.imageUrl}
          alt={booking.workspace.name}
          className="h-28 w-full rounded-xl object-cover sm:h-20 sm:w-28"
        />
      ) : (
        <div className="h-28 w-full rounded-xl bg-muted sm:h-20 sm:w-28" />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-foreground">{booking.workspace.name}</h3>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[booking.status]}`}
          >
            {booking.status}
          </span>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Building2 className="size-3.5 text-primary" /> {booking.workspace.location.name},{" "}
          {booking.workspace.location.city}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5 text-primary" /> {booking.bookingDate}
          <Clock className="ml-2 size-3.5 text-primary" /> {booking.startTime}–{booking.endTime}
        </p>
        <p className="mt-1 text-xs font-semibold text-foreground">
          {formatMoney(booking.totalAmount)}{" "}
          <span className="font-mono text-[11px] font-normal text-muted-foreground">
            · {booking.reference}
          </span>
        </p>
        {!booking.canCancel && cancellationCutoff && booking.status !== "cancelled" && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Cancellation closed {cancellationCutoff.toLocaleString()}
          </p>
        )}
      </div>

      <div className="flex shrink-0 gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/booking/confirmation" search={{ reference: booking.reference }}>
            View pass
          </Link>
        </Button>
        {booking.canCancel && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => onCancel(booking)}
          >
            Cancel
          </Button>
        )}
      </div>
    </article>
  );
}

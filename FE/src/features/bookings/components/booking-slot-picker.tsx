import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/features/auth";
import { formatMoney } from "@/shared/format";
import { useBookingPrice } from "../pricing/use-booking-price";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Picks a date/time and shows a live price — display-only
 * (`useBookingPrice`); the server prices the booking independently on
 * submit. Lives on the workspace detail page, feeds `/booking/review`.
 */
export function BookingSlotPicker({
  workspaceId,
  pricePerHour,
  taxPercent,
  minimumDurationMinutes,
  bookable,
}: {
  workspaceId: string;
  pricePerHour: string;
  taxPercent: string;
  minimumDurationMinutes: number;
  bookable: boolean;
}) {
  const { data } = useSession();
  const navigate = useNavigate();
  const [date, setDate] = useState(todayISO());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");

  const price = useBookingPrice({ startTime, endTime, unitPrice: pricePerHour, taxPercent });
  const isValidDuration = price.durationHours * 60 >= minimumDurationMinutes;

  return (
    <div className="mt-5 space-y-3 border-t border-border pt-5">
      <div className="grid gap-1.5">
        <Label htmlFor="slot-date">Date</Label>
        <Input
          id="slot-date"
          type="date"
          min={todayISO()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1.5">
          <Label htmlFor="slot-start">Start</Label>
          <Input
            id="slot-start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="slot-end">End</Label>
          <Input
            id="slot-end"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      {!isValidDuration && (
        <p role="alert" className="text-xs text-destructive">
          Minimum booking length is {minimumDurationMinutes} minutes.
        </p>
      )}

      <div className="rounded-lg bg-surface p-3 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal ({price.durationHours}h)</span>
          <span>{formatMoney(price.subtotalAmount)}</span>
        </div>
        <div className="mt-1 flex justify-between text-muted-foreground">
          <span>Tax</span>
          <span>{formatMoney(price.taxAmount)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-bold text-foreground">
          <span>Total</span>
          <span>{formatMoney(price.totalAmount)}</span>
        </div>
      </div>

      {!bookable ? (
        <Button className="w-full" disabled>
          Unavailable
        </Button>
      ) : data?.session ? (
        <Button
          className="w-full bg-galaxy-accent font-semibold"
          disabled={!isValidDuration}
          onClick={() =>
            void navigate({
              to: "/booking/review",
              search: { workspaceId, date, start: startTime, end: endTime },
            })
          }
        >
          Continue to review
        </Button>
      ) : (
        <Button asChild className="w-full bg-galaxy-accent font-semibold">
          <Link to="/login">Log in to book</Link>
        </Button>
      )}
    </div>
  );
}

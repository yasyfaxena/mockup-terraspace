import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCancelBooking } from "../bookings.queries";
import type { BookingListItemDto } from "../bookings.types";

export function CancelBookingDialog({
  booking,
  open,
  onOpenChange,
}: {
  booking: BookingListItemDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const cancelBooking = useCancelBooking();

  async function handleConfirm() {
    if (!booking) return;
    try {
      await cancelBooking.mutateAsync(booking.id);
      toast.success(`Booking cancelled — ${booking.workspace.name}`);
      onOpenChange(false);
    } catch {
      // query-client's global handler already toasts the real ApiError message
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this booking?</DialogTitle>
        </DialogHeader>
        {booking && (
          <p className="text-sm text-muted-foreground">
            {booking.workspace.name} on {booking.bookingDate}, {booking.startTime}–{booking.endTime}
            . This can't be undone.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep booking
          </Button>
          <Button
            variant="destructive"
            disabled={cancelBooking.isPending}
            onClick={() => void handleConfirm()}
          >
            {cancelBooking.isPending ? "Cancelling…" : "Cancel booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

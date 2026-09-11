import { useEffect, useState } from "react";
import { CheckCircle2, Clock, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePaymentStatus, useCreateCharge } from "../payments.queries";

const STUCK_PENDING_MS = 60_000;

/**
 * Polls `GET /bookings/:reference/payment` while the customer is back on
 * the confirmation screen — the webhook lands asynchronously, so this is
 * what actually turns `pending` into `paid` without a manual refresh
 * (development-phases.md Phase 6).
 */
export function PaymentStatusPoller({
  bookingId,
  reference,
}: {
  bookingId: string;
  reference: string;
}) {
  const { data: payment, isPending } = usePaymentStatus(reference);
  const createCharge = useCreateCharge();
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (!payment || payment.status !== "pending") {
      setStuck(false);
      return;
    }
    const timer = setTimeout(() => setStuck(true), STUCK_PENDING_MS);
    return () => clearTimeout(timer);
  }, [payment]);

  async function handleRetry() {
    // A stuck `pending` almost always still has a live session server-side,
    // so this hits PAYMENT_ALREADY_PENDING and reuses its checkoutUrl —
    // same recovery path as checkout-redirect.tsx, just triggered by the
    // customer instead of automatically.
    try {
      const charge = await createCharge.mutateAsync({ bookingId });
      window.location.href = charge.checkoutUrl;
    } catch {
      if (payment?.checkoutUrl) window.location.href = payment.checkoutUrl;
    }
  }

  if (isPending || !payment) return null;

  if (payment.status === "paid") {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-2.5 text-sm font-medium text-success">
        <CheckCircle2 className="size-4" /> Payment confirmed.
      </p>
    );
  }

  if (payment.status === "pending" || payment.status === "awaiting_payment") {
    return (
      <div className="space-y-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
        <p className="flex items-center gap-2">
          <Clock className="size-4 animate-pulse" /> Waiting for payment confirmation…
        </p>
        {stuck && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => void handleRetry()}
          >
            <RotateCw className="size-3.5" /> Resume checkout
          </Button>
        )}
      </div>
    );
  }

  return (
    <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
      Payment {payment.status.replace("_", " ")}.
    </p>
  );
}

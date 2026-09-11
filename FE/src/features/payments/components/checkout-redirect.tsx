import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { getPaymentStatus } from "../payments.api";
import { useCreateCharge } from "../payments.queries";

/**
 * Hands off to PayBridge's `checkoutUrl` — no payment form is built
 * in-house (development-phases.md Phase 6). `PAYMENT_ALREADY_PENDING`'s
 * `409` carries no details of its own (payments.errors.js), so recovering
 * the existing session's real `checkoutUrl` means a second call, to
 * `GET /bookings/:reference/payment`, not something extracted from the
 * error itself.
 */
export function CheckoutRedirect({
  bookingId,
  reference,
}: {
  bookingId: string;
  reference: string;
}) {
  const createCharge = useCreateCharge();
  const attempted = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    void startCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once, `bookingId` is stable for this page's lifetime
  }, []);

  async function startCheckout() {
    try {
      const charge = await createCharge.mutateAsync({ bookingId });
      window.location.href = charge.checkoutUrl;
    } catch (err) {
      if (err instanceof ApiError && err.code === "PAYMENT_ALREADY_PENDING") {
        try {
          const status = await getPaymentStatus(reference);
          if (status.checkoutUrl) {
            window.location.href = status.checkoutUrl;
            return;
          }
        } catch {
          // fall through to the generic error below
        }
        setError("A checkout session is already in progress. Refresh this page and try again.");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Could not start checkout.");
    }
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center"
      >
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-10 text-center"
    >
      <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Redirecting to PayBridge checkout…</p>
    </div>
  );
}

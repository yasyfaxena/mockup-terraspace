import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SiteShell } from "@/components/layout/site-shell";
import { requireAuth } from "@/features/auth";
import { CheckoutRedirect } from "@/features/payments";

const checkoutSearchSchema = z.object({ bookingId: z.string(), reference: z.string() });

export const Route = createFileRoute("/booking/checkout")({
  validateSearch: checkoutSearchSchema,
  beforeLoad: () => requireAuth(),
  component: BookingCheckoutPage,
});

function BookingCheckoutPage() {
  const { bookingId, reference } = Route.useSearch();

  return (
    <SiteShell>
      <section className="container-page max-w-lg py-16">
        <CheckoutRedirect bookingId={bookingId} reference={reference} />
      </section>
    </SiteShell>
  );
}

import { Edit3 } from "lucide-react";
import { formatMoney } from "@/shared/format";
import type { AdminPaymentListItemDto, PaymentStatus } from "../payments.types";

// One place mapping the real payment_state enum to a display label —
// V1 invented prose per screen ("Successful"/"Failed") instead of using
// the actual enum values (features/payments.md).
const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pending",
  awaiting_payment: "Awaiting payment",
  paid: "Paid",
  failed: "Failed",
  expired: "Expired",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};

const STATUS_STYLES: Record<PaymentStatus, string> = {
  pending: "bg-warning/18 text-warning-foreground border-warning/40",
  awaiting_payment: "bg-warning/18 text-warning-foreground border-warning/40",
  paid: "bg-success/12 text-success border-success/25",
  failed: "bg-destructive/10 text-destructive border-destructive/25",
  expired: "bg-muted text-muted-foreground border-border",
  refunded: "bg-primary/10 text-primary border-primary/25",
  partially_refunded: "bg-primary/10 text-primary border-primary/25",
};

export function AdminPaymentTable({
  payments,
  onRefund,
}: {
  payments: AdminPaymentListItemDto[];
  onRefund: (payment: AdminPaymentListItemDto) => void;
}) {
  if (payments.length === 0) {
    return <p className="py-8 text-center text-sm text-white/40">No payments found.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[.07]">
      {payments.map((payment) => (
        <div
          key={payment.id}
          className="flex flex-wrap items-center gap-4 border-b border-white/[.04] px-5 py-4 last:border-b-0"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">
              {formatMoney(payment.amount)}{" "}
              {Number(payment.refundedAmount) > 0 && (
                <span className="text-xs font-normal text-white/40">
                  ({formatMoney(payment.refundedAmount)} refunded)
                </span>
              )}
            </p>
            <p className="truncate text-xs text-white/30">
              {payment.customer.name} · {payment.booking.reference} ·{" "}
              {payment.paymentMethod?.name ?? payment.provider}
            </p>
          </div>
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[payment.status]}`}
          >
            {STATUS_LABELS[payment.status]}
          </span>
          {(payment.status === "paid" || payment.status === "partially_refunded") && (
            <button
              onClick={() => onRefund(payment)}
              className="p-2 text-white/35 hover:text-white"
              title="Refund"
            >
              <Edit3 className="size-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

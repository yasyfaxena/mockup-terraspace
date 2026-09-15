import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/shared/format";
import { useRefundPayment } from "../payments.queries";
import type { AdminPaymentDetailDto } from "../payments.types";

/**
 * Full or partial refund — the client-side cap on `amount` is UX only, the
 * real guard is BE's `422 REFUND_EXCEEDS_REMAINDER` (development-phases.md
 * Phase 6). `remainingAmount` is computed from the same detail DTO already
 * on screen (`amount` minus succeeded refunds), not a second endpoint.
 */
export function AdminRefundDialog({
  payment,
  open,
  onOpenChange,
}: {
  payment: AdminPaymentDetailDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const refundPayment = useRefundPayment();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const refundedSoFar = (payment?.refunds ?? [])
    .filter((r) => r.status === "succeeded")
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const remaining = payment ? Number(payment.amount) - refundedSoFar : 0;

  useEffect(() => {
    if (open) {
      setAmount("");
      setReason("");
    }
  }, [open]);

  const parsedAmount = amount.trim() === "" ? undefined : Number(amount);
  const exceedsRemainder = parsedAmount !== undefined && parsedAmount > remaining;
  const invalidAmount = parsedAmount !== undefined && parsedAmount <= 0;

  async function handleSubmit() {
    if (!payment) return;
    try {
      const result = await refundPayment.mutateAsync({
        id: payment.id,
        input: { amount: parsedAmount, reason: reason.trim() || undefined },
      });
      toast.success(`Refunded ${formatMoney(result.amount)}`);
      onOpenChange(false);
    } catch {
      // query-client's global handler already toasts the real ApiError
      // message, including a genuine 422 REFUND_EXCEEDS_REMAINDER if this
      // client-side check somehow let a stale number through
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refund payment</DialogTitle>
        </DialogHeader>

        {payment && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Remaining balance: <span className="font-semibold">{formatMoney(remaining)}</span> of{" "}
              {formatMoney(payment.amount)}
            </p>

            <div className="grid gap-1.5">
              <Label htmlFor="refund-amount">Amount (leave blank for full remaining balance)</Label>
              <Input
                id="refund-amount"
                type="number"
                min={0}
                max={remaining}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {exceedsRemainder && (
                <p className="text-xs text-destructive">
                  Cannot exceed the remaining balance ({formatMoney(remaining)}).
                </p>
              )}
              {invalidAmount && <p className="text-xs text-destructive">Must be greater than 0.</p>}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="refund-reason">Reason (optional)</Label>
              <Input
                id="refund-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="destructive"
            disabled={
              exceedsRemainder || invalidAmount || remaining <= 0 || refundPayment.isPending
            }
            onClick={() => void handleSubmit()}
          >
            {refundPayment.isPending ? "Refunding…" : "Issue refund"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

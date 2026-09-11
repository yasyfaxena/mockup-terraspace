import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AdminPaymentTable,
  AdminRefundDialog,
  adminPaymentsListQueryOptions,
  useAdminPaymentDetail,
  useAdminPayments,
  type AdminPaymentListItemDto,
} from "@/features/payments";

const PAYMENT_STATUSES = [
  "pending",
  "awaiting_payment",
  "paid",
  "failed",
  "expired",
  "refunded",
  "partially_refunded",
] as const;

const paymentsSearchSchema = z.object({
  status: z.enum(PAYMENT_STATUSES).optional(),
  page: z.number().int().min(1).optional(),
});

export const Route = createFileRoute("/admin/payments")({
  validateSearch: paymentsSearchSchema,
  loaderDeps: ({ search }) => ({ status: search.status, page: search.page ?? 1 }),
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureQueryData(adminPaymentsListQueryOptions(deps)),
  component: AdminPaymentsPage,
});

function AdminPaymentsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const status = search.status;
  const page = search.page ?? 1;

  const { data, isPending } = useAdminPayments({ status, page });
  const payments = data?.data ?? [];
  const meta = data?.meta;

  const [refundingId, setRefundingId] = useState<string | null>(null);
  const { data: refundingPayment } = useAdminPaymentDetail(refundingId ?? "");

  function handleRefund(payment: AdminPaymentListItemDto) {
    setRefundingId(payment.id);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-white/35">All payments from the live V2 API.</p>
        <Select
          value={status ?? "all"}
          onValueChange={(v) =>
            void navigate({
              search: { status: v === "all" ? undefined : (v as typeof status), page: undefined },
            })
          }
        >
          <SelectTrigger className="w-48 border-white/[.1] bg-white/[.05] text-xs text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {PAYMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : (
        <AdminPaymentTable payments={payments} onRefund={handleRefund} />
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-white/40">
          <button
            disabled={meta.page <= 1}
            onClick={() => void navigate({ search: { status, page: meta.page - 1 } })}
            className="disabled:opacity-30"
          >
            Previous
          </button>
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <button
            disabled={meta.page >= meta.totalPages}
            onClick={() => void navigate({ search: { status, page: meta.page + 1 } })}
            className="disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}

      <AdminRefundDialog
        payment={refundingPayment ?? null}
        open={refundingId !== null}
        onOpenChange={(open) => !open && setRefundingId(null)}
      />
    </div>
  );
}

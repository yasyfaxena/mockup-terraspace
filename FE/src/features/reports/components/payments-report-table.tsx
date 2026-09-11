import { formatMoney } from "@/shared/format";
import type { PaymentsLedgerDto } from "../reports.types";

/**
 * The finance ledger view (`GET /admin/reports/payments`) — distinct from
 * `features/payments`' admin payments list, which is the operational
 * refund-action screen. This one assumes a single operating currency (no
 * `byCurrency` contract, unlike the revenue report — reports.mapper.js's
 * own documented assumption), matching this deployment's IDR-only setup.
 */
export function PaymentsReportTable({ data }: { data: PaymentsLedgerDto }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-white/[.07] bg-white/[.03] px-4 py-3">
          <p className="text-[11px] font-medium text-white/40">Paid</p>
          <p className="mt-1 text-base font-bold text-success">{formatMoney(data.totals.paid)}</p>
        </div>
        <div className="rounded-xl border border-white/[.07] bg-white/[.03] px-4 py-3">
          <p className="text-[11px] font-medium text-white/40">Refunded</p>
          <p className="mt-1 text-base font-bold text-white">{formatMoney(data.totals.refunded)}</p>
        </div>
        <div className="rounded-xl border border-white/[.07] bg-white/[.03] px-4 py-3">
          <p className="text-[11px] font-medium text-white/40">Pending</p>
          <p className="mt-1 text-base font-bold text-warning-foreground">
            {formatMoney(data.totals.pending)}
          </p>
        </div>
        <div className="rounded-xl border border-white/[.07] bg-white/[.03] px-4 py-3">
          <p className="text-[11px] font-medium text-white/40">Failed</p>
          <p className="mt-1 text-base font-bold text-destructive">
            {formatMoney(data.totals.failed)}
          </p>
        </div>
      </div>

      {data.data.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/40">No payments in this range.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[.07]">
          {data.data.map((row) => (
            <div
              key={row.paymentId}
              className="flex flex-wrap items-center gap-4 border-b border-white/[.04] px-4 py-3 text-sm last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">
                  {formatMoney(row.amount)}{" "}
                  {Number(row.refundedAmount) > 0 && (
                    <span className="text-xs font-normal text-white/40">
                      ({formatMoney(row.refundedAmount)} refunded)
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-white/35">
                  {row.customerName} · {row.bookingReference} ·{" "}
                  {row.paymentMethod?.code ?? row.provider}
                </p>
              </div>
              <span className="rounded-full border border-white/[.1] px-2.5 py-1 text-[10px] font-semibold uppercase text-white/45">
                {row.status.replace("_", " ")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

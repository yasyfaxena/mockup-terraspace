import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/shared/format";
import type { RevenueDto, RevenueForCurrency } from "../reports.types";

function TotalsRow({ shaped }: { shaped: RevenueForCurrency }) {
  const t = shaped.totals;
  const tiles = [
    { label: "Gross revenue", value: formatMoney(t.grossRevenue) },
    { label: "Refunded", value: formatMoney(t.refundedAmount) },
    { label: "Net revenue", value: formatMoney(t.netRevenue) },
    { label: "Tax collected", value: formatMoney(t.taxCollected) },
    { label: "Bookings", value: t.bookingCount.toString() },
    { label: "Avg. booking", value: formatMoney(t.averageBookingValue) },
    { label: "Cancellation rate", value: `${t.cancellationRate}%` },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-xl border border-white/[.07] bg-white/[.03] px-3 py-2.5"
        >
          <p className="text-[10px] font-medium text-white/40">{tile.label}</p>
          <p className="mt-0.5 text-sm font-bold text-white">{tile.value}</p>
        </div>
      ))}
    </div>
  );
}

function ShareBreakdown({
  title,
  rows,
}: {
  title: string;
  rows: RevenueForCurrency["byLocation"];
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-white/50">{title}</p>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div
            key={row.locationId ?? row.locationName ?? row.type}
            className="flex items-center gap-3 text-xs"
          >
            <span className="w-28 shrink-0 truncate text-white/60">
              {row.locationName ?? row.type}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[.06]">
              <div
                className="h-full rounded-full bg-[#6366f1]"
                style={{ width: `${Math.min(100, row.sharePercent)}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-white/40">{row.sharePercent}%</span>
            <span className="w-20 shrink-0 text-right font-medium text-white/70">
              {formatMoney(row.netRevenue)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ForCurrency({ shaped }: { shaped: RevenueForCurrency }) {
  return (
    <div className="space-y-4">
      <TotalsRow shaped={shaped} />
      {shaped.series.length > 0 && (
        <div className="h-64 rounded-xl border border-white/[.07] bg-white/[.02] p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={shaped.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="period" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#0d1424", border: "1px solid rgba(255,255,255,.1)" }}
                labelStyle={{ color: "white" }}
                formatter={(value: number) => formatMoney(value)}
              />
              <Bar dataKey="grossRevenue" name="Gross revenue" fill="#6366f1" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <ShareBreakdown title="Revenue by location" rows={shaped.byLocation} />
        <ShareBreakdown title="Revenue by workspace type" rows={shaped.byWorkspaceType} />
      </div>
    </div>
  );
}

/**
 * Never sums amounts across currencies (revenue.md §2 rule 4) — renders
 * either the single-currency shape or one `ForCurrency` block per entry in
 * `byCurrency`, each keeping its own totals/series/breakdowns separate.
 */
export function RevenueReport({ data }: { data: RevenueDto }) {
  if ("byCurrency" in data) {
    if (data.byCurrency.length === 0) {
      return <p className="py-6 text-center text-sm text-white/40">No revenue in this range.</p>;
    }
    return (
      <div className="space-y-8">
        {data.byCurrency.map((shaped) => (
          <div key={shaped.currency}>
            <p className="mb-2 text-sm font-bold text-white">{shaped.currency}</p>
            <ForCurrency shaped={shaped} />
          </div>
        ))}
      </div>
    );
  }

  if (!data.currency) {
    return <p className="py-6 text-center text-sm text-white/40">No revenue in this range.</p>;
  }

  return <ForCurrency shaped={data} />;
}

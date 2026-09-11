import { ArrowDown, ArrowUp } from "lucide-react";
import { formatMoney } from "@/shared/format";
import type { OverviewDto } from "../reports.types";

function ChangeBadge({ percent }: { percent: number }) {
  if (percent === 0)
    return <span className="text-[11px] text-white/35">No change vs last week</span>;
  const up = percent > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${up ? "text-success" : "text-destructive"}`}
    >
      {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {Math.abs(percent)}% vs last week
    </span>
  );
}

/**
 * Daily KPI tiles — was V1 `admin-dashboard.tsx`'s 6-tile grid
 * (development-phases.md Phase 7). Every number here is pre-aggregated by
 * BE SQL (`GET /admin/reports/overview`), never derived from a raw booking
 * list client-side (features/reports.md §4).
 */
export function OverviewCards({ overview }: { overview: OverviewDto }) {
  const tiles = [
    {
      label: "Bookings today",
      value: overview.summary.bookingsToday.toString(),
      change: overview.comparison.bookingsChangePercent,
    },
    { label: "Confirmed today", value: overview.summary.confirmedToday.toString() },
    { label: "Cancelled today", value: overview.summary.cancelledToday.toString() },
    {
      label: "Revenue today",
      value: overview.currency ? formatMoney(overview.summary.revenueToday) : "—",
      change: overview.comparison.revenueChangePercent,
    },
    { label: "Occupancy", value: `${overview.summary.occupancyPercent}%` },
    { label: "New customers", value: overview.summary.newCustomersToday.toString() },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-xl border border-white/[.07] bg-white/[.03] px-4 py-3.5"
        >
          <p className="text-[11px] font-medium text-white/40">{tile.label}</p>
          <p className="mt-1 text-lg font-bold text-white">{tile.value}</p>
          {tile.change !== undefined && <ChangeBadge percent={tile.change} />}
        </div>
      ))}
    </div>
  );
}

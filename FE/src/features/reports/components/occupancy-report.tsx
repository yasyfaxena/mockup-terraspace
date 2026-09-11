import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/shared/format";
import type { OccupancyDto } from "../reports.types";

export function OccupancyReport({ data }: { data: OccupancyDto }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[.07] bg-white/[.03] px-4 py-3">
          <p className="text-[11px] font-medium text-white/40">Booked hours</p>
          <p className="mt-1 text-lg font-bold text-white">{data.totals.bookedHours}</p>
        </div>
        <div className="rounded-xl border border-white/[.07] bg-white/[.03] px-4 py-3">
          <p className="text-[11px] font-medium text-white/40">Available hours</p>
          <p className="mt-1 text-lg font-bold text-white">{data.totals.availableHours}</p>
        </div>
        <div className="rounded-xl border border-white/[.07] bg-white/[.03] px-4 py-3">
          <p className="text-[11px] font-medium text-white/40">Occupancy</p>
          <p className="mt-1 text-lg font-bold text-white">{data.totals.occupancyPercent}%</p>
        </div>
      </div>

      {data.series.length > 0 && (
        <div className="h-64 rounded-xl border border-white/[.07] bg-white/[.02] p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="period" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#0d1424", border: "1px solid rgba(255,255,255,.1)" }}
                labelStyle={{ color: "white" }}
                formatter={(value: number, name: string) =>
                  name === "occupancyPercent" ? `${value}%` : `${value}h`
                }
              />
              <Bar dataKey="occupancyPercent" name="Occupancy %" fill="#0ea5e9" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold text-white/50">Least utilized spaces</p>
        {data.leastUtilized.length === 0 ? (
          <p className="text-xs text-white/35">No bookable workspaces in this range.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/[.07]">
            {data.leastUtilized.map((row) => (
              <div
                key={row.workspaceId}
                className="flex items-center justify-between gap-3 border-b border-white/[.04] px-4 py-2.5 text-sm last:border-b-0"
              >
                <span className="truncate text-white/70">{row.workspaceName}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-white/40">{row.occupancyPercent}% occupied</span>
                  <span className="font-medium text-white/60">{formatMoney(row.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

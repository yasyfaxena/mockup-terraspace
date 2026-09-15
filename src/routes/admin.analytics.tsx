import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminLocations } from "@/features/locations/locations.queries";
import {
  ExportReportButton,
  OccupancyReport,
  PaymentsReportTable,
  REVENUE_WORKSPACE_TYPES,
  RevenueReport,
  occupancyQueryOptions,
  paymentsReportQueryOptions,
  revenueQueryOptions,
  useOccupancy,
  usePaymentsReport,
  useRevenue,
  type ReportGroupBy,
} from "@/features/reports";

const GROUP_BY_OPTIONS: ReportGroupBy[] = ["day", "week", "month"];
const MAX_REPORT_RANGE_DAYS = 366;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

const analyticsSearchSchema = z.object({
  tab: z.enum(["revenue", "occupancy", "payments"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  groupBy: z.enum(["day", "week", "month"]).optional(),
  locationId: z.string().optional(),
  workspaceType: z.string().optional(),
  status: z.string().optional(),
  provider: z.string().optional(),
  q: z.string().optional(),
  page: z.number().int().min(1).optional(),
});

export const Route = createFileRoute("/admin/analytics")({
  validateSearch: analyticsSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) => {
    const from = deps.from ?? isoDaysAgo(29);
    const to = deps.to ?? isoDaysAgo(0);
    const groupBy = deps.groupBy ?? "day";
    const tab = deps.tab ?? "revenue";
    if (tab === "revenue") {
      return queryClient.ensureQueryData(
        revenueQueryOptions({
          from,
          to,
          groupBy,
          locationId: deps.locationId,
          workspaceType: deps.workspaceType,
        }),
      );
    }
    if (tab === "occupancy") {
      return queryClient.ensureQueryData(
        occupancyQueryOptions({ from, to, groupBy, locationId: deps.locationId }),
      );
    }
    return queryClient.ensureQueryData(
      paymentsReportQueryOptions({
        from,
        to,
        status: deps.status,
        provider: deps.provider,
        q: deps.q,
        page: deps.page ?? 1,
      }),
    );
  },
  component: AdminAnalyticsPage,
});

function AdminAnalyticsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: locationsData } = useAdminLocations();
  const locations = locationsData?.data ?? [];

  const tab = search.tab ?? "revenue";
  const from = search.from ?? isoDaysAgo(29);
  const to = search.to ?? isoDaysAgo(0);
  const groupBy = search.groupBy ?? "day";
  const rangeTooWide =
    (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000 >
    MAX_REPORT_RANGE_DAYS;

  const revenue = useRevenue({
    from,
    to,
    groupBy,
    locationId: search.locationId,
    workspaceType: search.workspaceType,
  });
  const occupancy = useOccupancy({ from, to, groupBy, locationId: search.locationId });
  const paymentsReport = usePaymentsReport({
    from,
    to,
    status: search.status,
    provider: search.provider,
    q: search.q,
    page: search.page ?? 1,
  });

  return (
    <div className="space-y-5">
      <Tabs
        value={tab}
        onValueChange={(value) =>
          void navigate({ search: { ...search, tab: value as typeof tab } })
        }
      >
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3">
        {tab !== "payments" && (
          <>
            <input
              type="date"
              value={from}
              onChange={(e) => void navigate({ search: { ...search, from: e.target.value } })}
              className="rounded-md border border-white/[.1] bg-white/[.05] px-2.5 py-1.5 text-xs text-white"
            />
            <span className="text-xs text-white/30">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => void navigate({ search: { ...search, to: e.target.value } })}
              className="rounded-md border border-white/[.1] bg-white/[.05] px-2.5 py-1.5 text-xs text-white"
            />
            <select
              value={groupBy}
              onChange={(e) =>
                void navigate({ search: { ...search, groupBy: e.target.value as ReportGroupBy } })
              }
              className="rounded-md border border-white/[.1] bg-white/[.05] px-2.5 py-1.5 text-xs text-white"
            >
              {GROUP_BY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              value={search.locationId ?? ""}
              onChange={(e) =>
                void navigate({ search: { ...search, locationId: e.target.value || undefined } })
              }
              className="rounded-md border border-white/[.1] bg-white/[.05] px-2.5 py-1.5 text-xs text-white"
            >
              <option value="">All locations</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            {tab === "revenue" && (
              <select
                value={search.workspaceType ?? ""}
                onChange={(e) =>
                  void navigate({
                    search: { ...search, workspaceType: e.target.value || undefined },
                  })
                }
                className="rounded-md border border-white/[.1] bg-white/[.05] px-2.5 py-1.5 text-xs text-white"
              >
                <option value="">All space types</option>
                {REVENUE_WORKSPACE_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {value.replace("_", " ")}
                  </option>
                ))}
              </select>
            )}
          </>
        )}
        {tab !== "payments" && (
          <ExportReportButton
            params={{
              report: tab === "revenue" ? "revenue" : "bookings",
              from,
              to,
              locationId: search.locationId,
            }}
          />
        )}
      </div>

      {rangeTooWide && (
        <p className="text-xs text-destructive">
          Range spans more than {MAX_REPORT_RANGE_DAYS} days — the server will reject this. Narrow
          the dates.
        </p>
      )}

      {tab === "revenue" &&
        (revenue.isPending || !revenue.data ? (
          <p className="text-sm text-white/40">Loading…</p>
        ) : (
          <RevenueReport data={revenue.data} />
        ))}

      {tab === "occupancy" &&
        (occupancy.isPending || !occupancy.data ? (
          <p className="text-sm text-white/40">Loading…</p>
        ) : (
          <OccupancyReport data={occupancy.data} />
        ))}

      {tab === "payments" &&
        (paymentsReport.isPending || !paymentsReport.data ? (
          <p className="text-sm text-white/40">Loading…</p>
        ) : (
          <div className="space-y-3">
            <PaymentsReportTable data={paymentsReport.data} />
            {paymentsReport.data.meta.totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-white/40">
                <button
                  disabled={paymentsReport.data.meta.page <= 1}
                  onClick={() =>
                    void navigate({
                      search: { ...search, page: paymentsReport.data.meta.page - 1 },
                    })
                  }
                  className="disabled:opacity-30"
                >
                  Previous
                </button>
                <span>
                  Page {paymentsReport.data.meta.page} of {paymentsReport.data.meta.totalPages}
                </span>
                <button
                  disabled={paymentsReport.data.meta.page >= paymentsReport.data.meta.totalPages}
                  onClick={() =>
                    void navigate({
                      search: { ...search, page: paymentsReport.data.meta.page + 1 },
                    })
                  }
                  className="disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

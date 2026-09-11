import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useAdminLocations } from "@/features/locations/locations.queries";
import {
  ActivityFeed,
  OverviewCards,
  ScheduleTable,
  activityQueryOptions,
  overviewQueryOptions,
  useActivity,
  useOverview,
} from "@/features/reports";

const dashboardSearchSchema = z.object({
  date: z.string().optional(),
  locationId: z.string().optional(),
});

export const Route = createFileRoute("/admin/dashboard")({
  validateSearch: dashboardSearchSchema,
  loaderDeps: ({ search }) => ({ date: search.date, locationId: search.locationId }),
  loader: ({ context: { queryClient }, deps }) =>
    Promise.all([
      queryClient.ensureQueryData(overviewQueryOptions(deps)),
      queryClient.ensureQueryData(activityQueryOptions({ limit: 20 })),
    ]),
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: overview, isPending } = useOverview(search);
  const { data: activity } = useActivity({ limit: 20 });
  const { data: locationsData } = useAdminLocations();
  const locations = locationsData?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={search.date ?? ""}
          onChange={(e) =>
            void navigate({ search: { ...search, date: e.target.value || undefined } })
          }
          className="rounded-md border border-white/[.1] bg-white/[.05] px-2.5 py-1.5 text-xs text-white"
        />
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
      </div>

      {isPending || !overview ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : (
        <>
          <OverviewCards overview={overview} />

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
                Today's schedule
              </p>
              <ScheduleTable schedule={overview.schedule} />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">
                Activity
              </p>
              <ActivityFeed items={activity?.data ?? []} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

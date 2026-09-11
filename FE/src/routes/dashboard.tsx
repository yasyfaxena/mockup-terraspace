import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireAuth } from "@/features/auth";
import {
  BookingCard,
  bookingsListQueryOptions,
  CancelBookingDialog,
  estimateCancellationCutoff,
  useBookings,
  type BookingListItemDto,
} from "@/features/bookings";
import { publicSettingsQueryOptions, usePublicSettings } from "@/features/settings";

const dashboardSearchSchema = z.object({
  scope: z.enum(["upcoming", "past", "all"]).optional(),
  page: z.number().int().min(1).optional(),
});

export const Route = createFileRoute("/dashboard")({
  validateSearch: dashboardSearchSchema,
  beforeLoad: () => requireAuth(),
  loaderDeps: ({ search }) => ({ scope: search.scope ?? "upcoming", page: search.page ?? 1 }),
  loader: ({ context: { queryClient }, deps }) =>
    Promise.all([
      queryClient.ensureQueryData(bookingsListQueryOptions(deps)),
      queryClient.ensureQueryData(publicSettingsQueryOptions()),
    ]),
  component: DashboardPage,
});

function DashboardPage() {
  // beforeLoad's already-resolved session, not a second useSession() call —
  // avoids an SSR flash where the name would briefly render blank.
  const { user } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const scope = search.scope ?? "upcoming";
  const page = search.page ?? 1;

  const { data, isPending } = useBookings({ scope, page });
  const { data: settings } = usePublicSettings();
  const bookings = data?.data ?? [];
  const meta = data?.meta;

  const [cancelling, setCancelling] = useState<BookingListItemDto | null>(null);

  return (
    <SiteShell>
      <PageHeader title="My Account" description={`Signed in as ${user.name}.`} />

      <section className="container-page py-8">
        <Tabs
          value={scope}
          onValueChange={(value) =>
            void navigate({ search: { scope: value as typeof scope, page: undefined } })
          }
        >
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-6 space-y-4">
          {isPending && [0, 1].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}

          {!isPending && bookings.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No {scope !== "all" ? scope : ""} bookings yet.
            </p>
          )}

          {!isPending &&
            bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                cancellationCutoff={
                  settings
                    ? estimateCancellationCutoff(
                        booking.bookingDate,
                        booking.startTime,
                        settings.cancellationWindowHours,
                      )
                    : null
                }
                onCancel={setCancelling}
              />
            ))}
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => void navigate({ search: { scope, page: meta.page - 1 } })}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {meta.page} of {meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => void navigate({ search: { scope, page: meta.page + 1 } })}
            >
              Next
            </Button>
          </div>
        )}
      </section>

      <CancelBookingDialog
        booking={cancelling}
        open={cancelling !== null}
        onOpenChange={(open) => !open && setCancelling(null)}
      />
    </SiteShell>
  );
}

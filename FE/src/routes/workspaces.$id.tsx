import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MapPin, ShieldCheck } from "lucide-react";
import { SiteShell } from "@/components/layout/site-shell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AvailabilityBadge,
  AvailabilityCalendar,
  useWorkspace,
  workspaceDetailQueryOptions,
} from "@/features/workspaces";
import { BookingSlotPicker } from "@/features/bookings";
import { formatMoney } from "@/shared/format";
import { ApiError } from "@/lib/api-client";

export const Route = createFileRoute("/workspaces/$id")({
  loader: async ({ context: { queryClient }, params }) => {
    try {
      await queryClient.ensureQueryData(workspaceDetailQueryOptions(params.id));
    } catch (error) {
      if (error instanceof ApiError && error.code === "NOT_FOUND") throw notFound();
      throw error;
    }
  },
  component: WorkspaceDetailPage,
});

function WorkspaceDetailPage() {
  const { id } = Route.useParams();
  const { data: workspace, isPending, isError } = useWorkspace(id);

  if (isPending) {
    return (
      <SiteShell>
        <div className="container-page space-y-4 py-10">
          <Skeleton className="h-[320px] w-full rounded-xl" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </SiteShell>
    );
  }

  if (isError || !workspace) {
    return (
      <SiteShell>
        <div className="container-page py-24 text-center text-sm text-muted-foreground">
          Workspace not found.
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <section className="container-page py-8">
        <nav className="text-sm text-muted-foreground">
          <Link to="/workspaces" className="hover:text-foreground">
            Workspaces
          </Link>
          <span className="px-2">/</span>
          <span className="text-foreground">{workspace.name}</span>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <div>
            {workspace.imageUrl ? (
              <div className="overflow-hidden rounded-xl border border-border shadow-[var(--shadow-soft)]">
                <img
                  src={workspace.imageUrl}
                  alt={workspace.name}
                  className="h-[320px] w-full object-cover md:h-[420px]"
                />
              </div>
            ) : (
              <div className="h-[320px] w-full rounded-xl border border-border bg-muted md:h-[420px]" />
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {workspace.type}
              </span>
              <AvailabilityBadge status={workspace.availability} />
            </div>

            <h1 className="text-h1 mt-3">{workspace.name}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4 text-primary" /> {workspace.location.name} ·{" "}
                {workspace.floor}
              </span>
            </p>
            <p className="mt-1 pl-6 text-xs text-muted-foreground">
              {workspace.location.address}, {workspace.location.city}
            </p>

            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              {workspace.description}
            </p>

            <h2 className="text-h2 mt-9">Amenities</h2>
            <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {workspace.amenities.map((amenity) => (
                <div
                  key={amenity.id}
                  className="flex items-center gap-2.5 border-t border-border pt-3 text-sm"
                >
                  <ShieldCheck className="size-4 text-primary" /> {amenity.name}
                </div>
              ))}
            </div>

            <AvailabilityCalendar workspaceId={workspace.id} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] lg:sticky lg:top-24">
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="text-2xl font-bold text-foreground">
              {formatMoney(workspace.pricing.pricePerHour)}{" "}
              <span className="text-sm font-normal text-muted-foreground">/ hour</span>
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Minimum {workspace.pricing.minimumDurationMinutes} minutes. Bookable up to{" "}
              {workspace.pricing.advanceBookingDays} days ahead.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              {workspace.cancellationPolicy || "See our cancellation policy for details."}
            </p>

            <BookingSlotPicker
              workspaceId={workspace.id}
              pricePerHour={workspace.pricing.pricePerHour}
              taxPercent={workspace.pricing.taxPercent}
              minimumDurationMinutes={workspace.pricing.minimumDurationMinutes}
              bookable={
                workspace.availability === "available" || workspace.availability === "limited"
              }
            />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

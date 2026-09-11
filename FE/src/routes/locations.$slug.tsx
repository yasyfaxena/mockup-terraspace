import { createFileRoute, notFound } from "@tanstack/react-router";
import { Clock, MapPin, ShieldCheck } from "lucide-react";
import { SiteShell } from "@/components/layout/site-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { LocationMap, locationDetailQueryOptions, useLocation } from "@/features/locations";
import { AvailabilityBadge, WorkspaceCard } from "@/features/workspaces";
import { formatMoney } from "@/shared/format";
import { ApiError } from "@/lib/api-client";

export const Route = createFileRoute("/locations/$slug")({
  loader: async ({ context: { queryClient }, params }) => {
    try {
      await queryClient.ensureQueryData(locationDetailQueryOptions(params.slug));
    } catch (error) {
      // error-handling.md §5: a 404 is a route state (notFoundComponent),
      // not an SSR 500 from an unhandled ApiError.
      if (error instanceof ApiError && error.code === "NOT_FOUND") throw notFound();
      throw error;
    }
  },
  component: LocationDetailPage,
});

function LocationDetailPage() {
  const { slug } = Route.useParams();
  const { data: location, isPending, isError } = useLocation(slug);

  if (isPending) {
    return (
      <SiteShell>
        <div className="container-page space-y-4 py-10">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-[320px] w-full rounded-2xl" />
        </div>
      </SiteShell>
    );
  }

  if (isError || !location) {
    return (
      <SiteShell>
        <div className="container-page py-24 text-center text-sm text-muted-foreground">
          Location not found.
        </div>
      </SiteShell>
    );
  }

  const typeAvailability = location.stats.types.map((type) => {
    const count = location.workspaces.filter(
      (w) => w.type === type && (w.availability === "available" || w.availability === "limited"),
    ).length;
    return { type, count };
  });

  return (
    <SiteShell>
      <section className="border-b border-border bg-surface">
        <div className="container-page py-10">
          <nav className="text-xs font-semibold text-muted-foreground">
            <span>Locations</span>
            <span className="px-2">/</span>
            <span className="text-foreground">{location.name}</span>
          </nav>

          <div className="mt-5 flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="text-h1 font-bold">{location.name}</h1>
              <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="size-4 text-primary" /> {location.address}, {location.city}
              </p>
              <p className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="size-4 text-primary" /> {location.openingHours}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <AvailabilityBadge status={location.stats.availability} />
                {location.access247 ? (
                  <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
                    24/7 access for resident members
                  </span>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              <p className="text-xs text-muted-foreground">Starting from</p>
              <p className="text-2xl font-bold text-foreground">
                {formatMoney(location.stats.priceFrom)}
              </p>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Access is included with every booking.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 lg:grid-cols-[2fr_1fr]">
            {location.imageUrl ? (
              <img
                src={location.imageUrl}
                alt={`Workspace at ${location.name}`}
                loading="lazy"
                className="h-[320px] w-full rounded-2xl object-cover md:h-[420px]"
              />
            ) : (
              <div className="h-[320px] w-full rounded-2xl bg-muted md:h-[420px]" />
            )}
            <LocationMap
              latitude={location.latitude ? Number(location.latitude) : null}
              longitude={location.longitude ? Number(location.longitude) : null}
              name={location.name}
            />
          </div>

          <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            {location.description}
          </p>
        </div>
      </section>

      <section className="container-page py-12">
        <h2 className="text-h2 font-bold">Workspace availability today</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {typeAvailability.map(({ type, count }) => (
            <div
              key={type}
              className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 shadow-[var(--shadow-soft)]"
            >
              <span className="text-xs font-bold text-foreground">{type}</span>
              <AvailabilityBadge
                status={count === 0 ? "full" : count <= 3 ? "limited" : "available"}
                label={count === 0 ? "Fully booked" : `${count} available`}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface py-12">
        <div className="container-page">
          <h2 className="text-h2 font-bold">Facilities</h2>
          <div className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {location.amenities.map((amenity) => (
              <div
                key={amenity.id}
                className="flex items-center gap-2.5 border-t border-border pt-4 text-xs font-medium text-foreground"
              >
                <ShieldCheck className="size-4 text-primary" />
                {amenity.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {location.workspaces.length > 0 && (
        <section className="container-page py-12">
          <h2 className="text-h2 font-bold">Spaces at this location</h2>
          <div className="mt-6 grid gap-4">
            {location.workspaces.map((workspace) => (
              <WorkspaceCard
                key={workspace.id}
                workspace={{
                  ...workspace,
                  location: {
                    name: location.name,
                    address: location.address,
                    city: location.city,
                  },
                }}
              />
            ))}
          </div>
        </section>
      )}
    </SiteShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { SearchX } from "lucide-react";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { LocationCard, locationsListQueryOptions, useLocations } from "@/features/locations";

export const Route = createFileRoute("/locations/")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(locationsListQueryOptions()),
  component: LocationsPage,
});

function LocationsPage() {
  const { data, isPending, isError } = useLocations();
  const locations = data?.data ?? [];

  return (
    <SiteShell>
      <PageHeader
        eyebrow="Locations"
        title="Our locations"
        description="Every TerraSpace venue, with live desk and room availability."
      />
      <section className="container-page py-10">
        {isPending && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
                <Skeleton className="aspect-[16/10] w-full" />
                <div className="space-y-3 p-5">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <p className="py-12 text-center text-sm text-destructive">
            Could not load locations right now.
          </p>
        )}

        {!isPending && !isError && locations.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <SearchX className="mx-auto mb-3 size-8 text-muted-foreground/60" />
            <h3 className="text-base font-bold text-foreground">No locations yet</h3>
          </div>
        )}

        {!isPending && !isError && locations.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map((location) => (
              <LocationCard key={location.id} location={location} />
            ))}
          </div>
        )}
      </section>
    </SiteShell>
  );
}

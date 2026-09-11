import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { AmenityChip, amenitiesListQueryOptions, useAmenities } from "@/features/amenities";

export const Route = createFileRoute("/amenities")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(amenitiesListQueryOptions()),
  component: AmenitiesPage,
});

function AmenitiesPage() {
  const { data, isPending, isError } = useAmenities();
  const amenities = data?.data ?? [];

  const byCategory = new Map<string, typeof amenities>();
  for (const amenity of amenities) {
    const list = byCategory.get(amenity.category) ?? [];
    list.push(amenity);
    byCategory.set(amenity.category, list);
  }

  return (
    <SiteShell>
      <PageHeader
        eyebrow="Amenities"
        title="Every amenity across TerraSpace"
        description="High-speed Wi-Fi, meeting equipment, and comfort — available at select locations and workspaces."
      />
      <section className="container-page py-10">
        {isPending && (
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-7 w-24 rounded-md" />
            ))}
          </div>
        )}

        {isError && <p className="text-sm text-destructive">Could not load amenities right now.</p>}

        {!isPending && !isError && amenities.length === 0 && (
          <p className="text-sm text-muted-foreground">No amenities configured yet.</p>
        )}

        {!isPending && !isError && amenities.length > 0 && (
          <div className="space-y-8">
            {[...byCategory.entries()].map(([category, items]) => (
              <div key={category}>
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  {category}
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {items.map((amenity) => (
                    <AmenityChip key={amenity.id} amenity={amenity} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </SiteShell>
  );
}

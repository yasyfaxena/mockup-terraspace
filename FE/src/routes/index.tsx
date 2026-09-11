import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import { LocationCard, locationsListQueryOptions, useLocations } from "@/features/locations";
import { SearchModule } from "@/features/workspaces";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(locationsListQueryOptions()),
  component: HomePage,
});

function HomePage() {
  const { data, isPending } = useLocations();
  const locations = data?.data ?? [];

  return (
    <SiteShell>
      <section className="border-b border-border bg-surface">
        <div className="container-page py-16 md:py-20">
          <p className="text-eyebrow">TerraSpace</p>
          <h1 className="text-h1 mt-2 max-w-2xl">Find your premium workspace</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Live inventory across every location. Reserve by the exact hour and minute, and walk in
            with your digital access ready.
          </p>
          <SearchModule className="mt-8" />
        </div>
      </section>

      <section className="container-page py-14">
        <h2 className="text-h2 font-bold">Browse locations</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isPending
            ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)
            : locations
                .slice(0, 3)
                .map((location) => <LocationCard key={location.id} location={location} />)}
        </div>
      </section>
    </SiteShell>
  );
}

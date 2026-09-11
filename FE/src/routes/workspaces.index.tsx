import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SearchX, SlidersHorizontal } from "lucide-react";
import { z } from "zod";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { amenitiesListQueryOptions, useAmenities } from "@/features/amenities";
import {
  useWorkspaces,
  workspacesListQueryOptions,
  WorkspaceCard,
  type WorkspaceType,
} from "@/features/workspaces";

const workspaceSearchSchema = z.object({
  location: z.string().optional(),
  type: z.string().optional(),
  amenityId: z.union([z.string(), z.array(z.string())]).optional(),
  page: z.number().int().min(1).optional(),
});

function toParams(search: z.infer<typeof workspaceSearchSchema>) {
  const amenityIds = Array.isArray(search.amenityId)
    ? search.amenityId
    : search.amenityId
      ? [search.amenityId]
      : undefined;
  return {
    locationSlug: search.location,
    type: search.type ? [search.type as WorkspaceType] : undefined,
    amenityId: amenityIds,
    page: search.page ?? 1,
  };
}

export const Route = createFileRoute("/workspaces/")({
  validateSearch: workspaceSearchSchema,
  loaderDeps: ({ search }) => toParams(search),
  loader: ({ context: { queryClient }, deps }) =>
    Promise.all([
      queryClient.ensureQueryData(workspacesListQueryOptions(deps)),
      queryClient.ensureQueryData(amenitiesListQueryOptions()),
    ]),
  component: WorkspacesPage,
});

const WORKSPACE_TYPES: { value: WorkspaceType; label: string }[] = [
  { value: "hot_desk", label: "Hot desk" },
  { value: "dedicated_desk", label: "Dedicated desk" },
  { value: "private_office", label: "Private office" },
  { value: "meeting_room", label: "Meeting room" },
  { value: "event_space", label: "Event space" },
];

function WorkspacesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { data: amenitiesData } = useAmenities();
  const amenities = amenitiesData?.data ?? [];
  const amenityIds = toParams(search).amenityId ?? [];

  const { data, isPending, isError } = useWorkspaces({
    ...toParams(search),
  });
  const workspaces = data?.data ?? [];
  const meta = data?.meta;

  function updateSearch(patch: Partial<z.infer<typeof workspaceSearchSchema>>) {
    void navigate({ to: "/workspaces", search: { ...search, page: undefined, ...patch } });
  }

  function toggleAmenity(id: string) {
    const next = amenityIds.includes(id) ? amenityIds.filter((a) => a !== id) : [...amenityIds, id];
    updateSearch({ amenityId: next.length ? next : undefined });
  }

  return (
    <SiteShell>
      <PageHeader
        eyebrow="Workspace Catalog"
        title="Available workspaces"
        description="Filter by type and amenities — availability and pricing come straight from the live catalog."
      />

      <section className="container-page grid gap-8 py-10 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] lg:sticky lg:top-24">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <SlidersHorizontal className="size-4 text-primary" /> Filter
          </h2>

          <div className="mt-5 grid gap-2">
            <Label className="text-xs font-semibold text-muted-foreground">Workspace type</Label>
            <Select
              value={search.type ?? "all"}
              onValueChange={(v) => updateSearch({ type: v === "all" ? undefined : v })}
            >
              <SelectTrigger className="w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {WORKSPACE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-6">
            <Label className="text-xs font-semibold text-muted-foreground">Amenities</Label>
            <div className="mt-3 grid gap-2.5">
              {amenities.map((amenity) => (
                <label
                  key={amenity.id}
                  className="flex cursor-pointer items-center gap-2.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Checkbox
                    checked={amenityIds.includes(amenity.id)}
                    onCheckedChange={() => toggleAmenity(amenity.id)}
                  />
                  {amenity.name}
                </label>
              ))}
            </div>
          </div>
        </aside>

        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {isPending
              ? "Loading…"
              : meta
                ? `${meta.total} workspace${meta.total === 1 ? "" : "s"} found`
                : null}
          </p>

          {isPending && (
            <div className="mt-6 grid gap-4">
              {[0, 1].map((i) => (
                <div key={i} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
                  <Skeleton className="h-40 w-60 rounded-xl" />
                  <div className="flex-1 space-y-3 py-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <p className="mt-8 text-center text-sm text-destructive">
              Could not load workspaces right now.
            </p>
          )}

          {!isPending && !isError && workspaces.length === 0 && (
            <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <SearchX className="mx-auto mb-3 size-8 text-muted-foreground/60" />
              <h3 className="text-base font-bold text-foreground">
                No workspaces match this search
              </h3>
              <Button
                variant="outline"
                size="sm"
                className="mt-5"
                onClick={() => void navigate({ to: "/workspaces", search: {} })}
              >
                Clear all filters
              </Button>
            </div>
          )}

          {!isPending && !isError && workspaces.length > 0 && (
            <>
              <div className="mt-6 grid gap-4">
                {workspaces.map((workspace) => (
                  <WorkspaceCard key={workspace.id} workspace={workspace} />
                ))}
              </div>

              {meta && meta.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={meta.page <= 1}
                    onClick={() => updateSearch({ page: meta.page - 1 })}
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
                    onClick={() => updateSearch({ page: meta.page + 1 })}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </SiteShell>
  );
}

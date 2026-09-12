import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, SearchX, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { formatMoney } from "@/shared/format";
import { cn } from "@/lib/utils";

const workspaceSearchSchema = z.object({
  location: z.string().optional(),
  type: z.string().optional(),
  amenityId: z.union([z.string(), z.array(z.string())]).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
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
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
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

  const [minInput, setMinInput] = useState(search.minPrice != null ? String(search.minPrice) : "");
  const [maxInput, setMaxInput] = useState(search.maxPrice != null ? String(search.maxPrice) : "");

  useEffect(() => {
    setMinInput(search.minPrice != null ? String(search.minPrice) : "");
  }, [search.minPrice]);

  useEffect(() => {
    setMaxInput(search.maxPrice != null ? String(search.maxPrice) : "");
  }, [search.maxPrice]);

  const { data, isPending, isError, isFetching } = useWorkspaces({
    ...toParams(search),
  });
  const workspaces = data?.data ?? [];
  const meta = data?.meta;

  const hasActiveFilters = Boolean(
    search.type ||
    search.minPrice != null ||
    search.maxPrice != null ||
    amenityIds.length > 0 ||
    search.location,
  );

  function updateSearch(patch: Partial<z.infer<typeof workspaceSearchSchema>>) {
    void navigate({
      to: "/workspaces",
      search: { ...search, page: undefined, ...patch },
      resetScroll: false,
    });
  }

  function commitPriceRange() {
    const minVal = minInput.trim() !== "" ? Number(minInput) : undefined;
    const maxVal = maxInput.trim() !== "" ? Number(maxInput) : undefined;

    if (minVal != null && maxVal != null && minVal > maxVal) {
      updateSearch({ minPrice: maxVal, maxPrice: minVal });
      return;
    }

    updateSearch({
      minPrice: Number.isFinite(minVal) && (minVal as number) >= 0 ? minVal : undefined,
      maxPrice: Number.isFinite(maxVal) && (maxVal as number) >= 0 ? maxVal : undefined,
    });
  }

  function applyPreset(min?: number, max?: number) {
    setMinInput(min != null ? String(min) : "");
    setMaxInput(max != null ? String(max) : "");
    updateSearch({ minPrice: min, maxPrice: max });
  }

  function toggleAmenity(id: string) {
    const next = amenityIds.includes(id) ? amenityIds.filter((a) => a !== id) : [...amenityIds, id];
    updateSearch({ amenityId: next.length ? next : undefined });
  }

  function clearAllFilters() {
    setMinInput("");
    setMaxInput("");
    void navigate({
      to: "/workspaces",
      search: {},
      resetScroll: false,
    });
  }

  return (
    <SiteShell>
      <PageHeader
        eyebrow="Workspace Catalog"
        title="Available workspaces"
        description="Filter by type, price, and amenities — availability and pricing come straight from the live catalog."
      />

      <section className="container-page grid gap-8 py-10 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <SlidersHorizontal className="size-4 text-primary" /> Filter
            </h2>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

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

          {/* Price Filtering */}
          <div className="mt-6 border-t border-border/70 pt-5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground">
                Price per hour (IDR)
              </Label>
              {(search.minPrice != null || search.maxPrice != null) && (
                <button
                  type="button"
                  onClick={() => {
                    setMinInput("");
                    setMaxInput("");
                    updateSearch({ minPrice: undefined, maxPrice: undefined });
                  }}
                  className="text-[11px] font-medium text-muted-foreground hover:text-primary"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] font-medium text-muted-foreground">Min (Rp)</span>
                <Input
                  type="number"
                  min={0}
                  step={5000}
                  placeholder="0"
                  value={minInput}
                  onChange={(e) => setMinInput(e.target.value)}
                  onBlur={commitPriceRange}
                  onKeyDown={(e) => e.key === "Enter" && commitPriceRange()}
                  className="h-8 text-xs font-medium"
                />
              </div>
              <div>
                <span className="text-[10px] font-medium text-muted-foreground">Max (Rp)</span>
                <Input
                  type="number"
                  min={0}
                  step={5000}
                  placeholder="Any"
                  value={maxInput}
                  onChange={(e) => setMaxInput(e.target.value)}
                  onBlur={commitPriceRange}
                  onKeyDown={(e) => e.key === "Enter" && commitPriceRange()}
                  className="h-8 text-xs font-medium"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  applyPreset(undefined, 25000);
                }}
                className={cn(
                  "rounded-lg border border-border/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground",
                  search.minPrice === undefined &&
                    search.maxPrice === 25000 &&
                    "border-primary bg-primary/10 font-bold text-primary",
                )}
              >
                &lt; 25k
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  applyPreset(25000, 60000);
                }}
                className={cn(
                  "rounded-lg border border-border/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground",
                  search.minPrice === 25000 &&
                    search.maxPrice === 60000 &&
                    "border-primary bg-primary/10 font-bold text-primary",
                )}
              >
                25k – 60k
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  applyPreset(60000, undefined);
                }}
                className={cn(
                  "rounded-lg border border-border/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground",
                  search.minPrice === 60000 &&
                    search.maxPrice === undefined &&
                    "border-primary bg-primary/10 font-bold text-primary",
                )}
              >
                &gt; 60k
              </button>
            </div>
          </div>

          <div className="mt-6 border-t border-border/70 pt-5">
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                {isPending && !data
                  ? "Loading…"
                  : meta
                    ? `${meta.total} workspace${meta.total === 1 ? "" : "s"} found`
                    : null}
              </p>
              {isFetching && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">Active:</span>
              {search.location && (
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                  Location: {search.location}
                  <button
                    type="button"
                    onClick={() => updateSearch({ location: undefined })}
                    className="hover:text-destructive"
                    aria-label="Remove location filter"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )}
              {search.type && (
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                  Type: {WORKSPACE_TYPES.find((t) => t.value === search.type)?.label ?? search.type}
                  <button
                    type="button"
                    onClick={() => updateSearch({ type: undefined })}
                    className="hover:text-destructive"
                    aria-label="Remove type filter"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )}
              {(search.minPrice != null || search.maxPrice != null) && (
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                  Price:{" "}
                  {search.minPrice != null && search.maxPrice != null
                    ? `${formatMoney(search.minPrice)} – ${formatMoney(search.maxPrice)}`
                    : search.minPrice != null
                      ? `≥ ${formatMoney(search.minPrice)}`
                      : search.maxPrice != null
                        ? `≤ ${formatMoney(search.maxPrice)}`
                        : ""}
                  <button
                    type="button"
                    onClick={() => {
                      setMinInput("");
                      setMaxInput("");
                      updateSearch({ minPrice: undefined, maxPrice: undefined });
                    }}
                    className="hover:text-destructive"
                    aria-label="Remove price filter"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )}
              {amenityIds.map((id) => {
                const item = amenities.find((a) => a.id === id);
                if (!item) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
                  >
                    {item.name}
                    <button
                      type="button"
                      onClick={() => toggleAmenity(id)}
                      className="hover:text-destructive"
                      aria-label={`Remove ${item.name} filter`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                );
              })}
              <button
                type="button"
                onClick={clearAllFilters}
                className="ml-1 text-xs font-semibold text-primary hover:underline"
              >
                Clear all
              </button>
            </div>
          )}

          {isPending && !data && (
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

          {isError && !data && (
            <p className="mt-8 text-center text-sm text-destructive">
              Could not load workspaces right now.
            </p>
          )}

          {!isPending && !isFetching && workspaces.length === 0 && (
            <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <SearchX className="mx-auto mb-3 size-8 text-muted-foreground/60" />
              <h3 className="text-base font-bold text-foreground">
                No workspaces match this search
              </h3>
              <Button variant="outline" size="sm" className="mt-5" onClick={clearAllFilters}>
                Clear all filters
              </Button>
            </div>
          )}

          {data && workspaces.length > 0 && (
            <>
              <div
                className={cn(
                  "mt-6 grid gap-4 transition-opacity duration-150",
                  isFetching && "opacity-60",
                )}
              >
                {workspaces.map((workspace) => (
                  <WorkspaceCard key={workspace.id} workspace={workspace} />
                ))}
              </div>

              {meta && meta.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={meta.page <= 1 || isFetching}
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
                    disabled={meta.page >= meta.totalPages || isFetching}
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

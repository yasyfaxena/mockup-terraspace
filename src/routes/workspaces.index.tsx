import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { List, Map as MapIcon, SearchX, SlidersHorizontal } from "lucide-react";
import { SiteShell, PageHeader } from "@/frontend/site/site-shell";
import { WorkspaceCard } from "@/frontend/site/cards";
import { Button } from "@/frontend/ui/button";
import { Input } from "@/frontend/ui/input";
import { Label } from "@/frontend/ui/label";
import { Checkbox } from "@/frontend/ui/checkbox";
import { Slider } from "@/frontend/ui/slider";
import { Skeleton } from "@/frontend/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/frontend/ui/select";
import { usePublicCatalog } from "@/frontend/data/catalog";
import { useI18n } from "@/lib/i18n";

type WorkspaceSearch = {
  location?: string;
  date?: string;
  time?: string;
  type?: string;
};

export const Route = createFileRoute("/workspaces/")({
  validateSearch: (search: Record<string, unknown>): WorkspaceSearch => ({
    location: typeof search["location"] === "string" ? search["location"] : "all",
    date:
      typeof search["date"] === "string" ? search["date"] : new Date().toISOString().slice(0, 10),
    time: typeof search["time"] === "string" ? search["time"] : "09:00",
    type: typeof search["type"] === "string" ? search["type"] : "all",
  }),
  head: () => ({
    meta: [
      { title: "Search available workspaces — TerraSpace" },
      {
        name: "description",
        content:
          "Search executive meeting rooms with instant digital access and live availability.",
      },
      { property: "og:title", content: "Search available workspaces" },
      {
        property: "og:description",
        content: "Filter by price and amenities, then book in two minutes.",
      },
    ],
  }),
  component: WorkspaceSearchPage,
});

const amenityFilters = ["Open floor layout", "PA system", "Wi-Fi", "Whiteboard"];

function WorkspaceSearchPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { t, money, locale } = useI18n();
  const { locations, workspaces } = usePublicCatalog();
  const workspaceTypes = Array.from(
    new Map(workspaces.map((w) => [w.type, { type: w.type }])).values(),
  );

  const location = search.location ?? "all";
  const type = search.type ?? "all";
  const date = search.date ?? new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(search.time ?? "09:00");
  const [end, setEnd] = useState("11:00");
  const [maxPrice, setMaxPrice] = useState(1000000);
  const [floor, setFloor] = useState("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [view, setView] = useState<"list" | "map">("list");
  const [sort, setSort] = useState("recommended");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const tm = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(tm);
  }, [location, type, date, start, end, maxPrice, floor, onlyAvailable, picked]);

  const results = useMemo(() => {
    const list = workspaces.filter((w) => {
      if (location !== "all" && w.locationSlug !== location) return false;
      if (type !== "all" && w.type !== type) return false;
      if (w.price > maxPrice) return false;
      if (floor !== "all" && !w.floor.toLowerCase().includes(floor.toLowerCase())) return false;
      if (onlyAvailable && (w.availability === "full" || w.availability === "unavailable"))
        return false;
      if (picked.length && !picked.every((a) => w.amenities.some((x) => x.includes(a))))
        return false;
      return true;
    });

    if (sort === "price-asc") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [location, type, maxPrice, floor, onlyAvailable, picked, sort]);

  return (
    <SiteShell>
      <PageHeader
        eyebrow={locale === "id" ? "Katalog Ruang Kerja" : "Workspace Catalog"}
        title={locale === "id" ? "Ruang Kerja & Pertemuan" : "Available Workspaces"}
        description={
          locale === "id"
            ? "Pilih tanggal, jam, dan jumlah orang. Harga dan ketersediaan langsung terupdate secara real-time."
            : "Set your date, time and group size. Live schedule and pricing update automatically."
        }
      >
        <div
          className={
            "grid gap-3 rounded-2xl border border-border bg-card p-4 md:items-end shadow-[var(--shadow-soft)] " +
            (locations.length > 1 ? "md:grid-cols-5" : "md:grid-cols-3")
          }
        >
          {locations.length > 1 ? (
            <div className="grid gap-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-muted-foreground">
                {t("common.location")}
              </Label>
              <Select
                value={location}
                onValueChange={(v) =>
                  navigate({ to: "/workspaces", search: { ...search, location: v } })
                }
              >
                <SelectTrigger className="w-full h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {locale === "id" ? "Semua Lokasi" : "All locations"}
                  </SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.slug} value={l.slug}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold text-muted-foreground" htmlFor="ws-date">
              {t("detail.date")}
            </Label>
            <Input
              id="ws-date"
              type="date"
              value={date}
              onChange={(e) =>
                navigate({ to: "/workspaces", search: { ...search, date: e.target.value } })
              }
              className="h-10 text-xs"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold text-muted-foreground" htmlFor="ws-start">
              {t("detail.startTime")}
            </Label>
            <Input
              id="ws-start"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="h-10 text-xs"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold text-muted-foreground" htmlFor="ws-end">
              {t("detail.endTime")}
            </Label>
            <Input
              id="ws-end"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="h-10 text-xs"
            />
          </div>
        </div>
      </PageHeader>

      <section className="container-page grid gap-8 py-10 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24 shadow-[var(--shadow-soft)]">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <SlidersHorizontal className="size-4 text-primary" /> {t("common.filter")}
          </h2>

          <div className="mt-5 grid gap-2">
            <Label className="text-xs font-semibold text-muted-foreground">
              {locale === "id" ? "Tipe Ruangan" : "Workspace type"}
            </Label>
            <Select
              value={type}
              onValueChange={(v) => navigate({ to: "/workspaces", search: { ...search, type: v } })}
            >
              <SelectTrigger className="w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{locale === "id" ? "Semua tipe" : "All types"}</SelectItem>
                {workspaceTypes.map((tItem) => (
                  <SelectItem key={tItem.type} value={tItem.type}>
                    {tItem.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-6">
            <Label className="text-xs font-semibold text-muted-foreground">
              {locale === "id" ? `Harga s/d ${money(maxPrice)}` : `Price up to ${money(maxPrice)}`}
            </Label>
            <Slider
              className="mt-3"
              min={100000}
              max={1000000}
              step={50000}
              value={[maxPrice]}
              onValueChange={(v) => setMaxPrice(v[0] ?? maxPrice)}
            />
          </div>

          <div className="mt-6">
            <Label className="text-xs font-semibold text-muted-foreground">
              {t("detail.amenities")}
            </Label>
            <div className="mt-3 grid gap-2.5">
              {amenityFilters.map((a) => (
                <label
                  key={a}
                  className="flex items-center gap-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Checkbox
                    checked={picked.includes(a)}
                    onCheckedChange={() =>
                      setPicked((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]))
                    }
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>
        </aside>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground font-medium">
              {loading
                ? t("common.loading")
                : locale === "id"
                  ? `${results.length} ruang kerja tersedia pada ${date}, ${start}–${end}`
                  : `${results.length} workspaces available on ${date}, ${start}–${end}`}
            </p>
            <div className="flex items-center gap-2">
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-[170px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended">
                    {locale === "id" ? "Rekomendasi" : "Recommended"}
                  </SelectItem>
                  <SelectItem value="price-asc">
                    {locale === "id" ? "Harga: Rendah ke Tinggi" : "Price: low to high"}
                  </SelectItem>
                  <SelectItem value="price-desc">
                    {locale === "id" ? "Harga: Tinggi ke Rendah" : "Price: high to low"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 grid gap-4">
              {[0, 1].map((i) => (
                <div key={i} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
                  <Skeleton className="h-40 w-60 rounded-xl" />
                  <div className="flex-1 space-y-3 py-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <SearchX className="mx-auto size-8 text-muted-foreground/60 mb-3" />
              <h3 className="text-base font-bold text-foreground">
                {locale === "id"
                  ? "Tidak ada ruang yang sesuai"
                  : "No workspaces match this search"}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground">
                {locale === "id"
                  ? "Coba sesuaikan filter harga atau fasilitas Anda."
                  : "Try clearing filters or adjusting price range."}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-5"
                onClick={() => {
                  setMaxPrice(1000000);
                  setFloor("all");
                  setPicked([]);
                  navigate({
                    to: "/workspaces",
                    search: { ...search, location: "all", type: "all" },
                  });
                }}
              >
                {locale === "id" ? "Reset Filter" : "Clear all filters"}
              </Button>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {results.map((w) => (
                <WorkspaceCard key={w.id} workspace={w} />
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}

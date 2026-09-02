import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Clock, MapPin, ShieldCheck, Wifi } from "lucide-react";
import { SiteShell } from "@/frontend/site/site-shell";
import { Button } from "@/frontend/ui/button";
import { AvailabilityBadge } from "@/frontend/site/availability-badge";
import { WorkspaceCard } from "@/frontend/site/cards";
import { LocationMap } from "@/frontend/site/location-map";
import { usePublicCatalog } from "@/frontend/data/catalog";
import { getPublicCatalog } from "@/backend";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/locations/$slug")({
  loader: async ({ params }) => {
    const catalog = await getPublicCatalog();
    const location = catalog.locations.find((l) => l.slug === params.slug);
    if (!location) throw notFound();
    return { name: location.name, city: location.city, description: location.description };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Location unavailable — TerraSpace" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${loaderData.name}, ${loaderData.city} — TerraSpace`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.description },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.description },
      ],
    };
  },
  component: LocationDetail,
});

function LocationDetail() {
  const { slug } = Route.useParams();
  const { locations, workspaces } = usePublicCatalog();
  const { t, money, locale } = useI18n();
  const location = locations.find((l) => l.slug === slug);
  const spaces = workspaces.filter((w) => w.locationSlug === slug);

  if (!location) {
    return (
      <SiteShell>
        <div className="container-page py-24 text-center text-sm text-muted-foreground">
          {t("common.loading")}
        </div>
      </SiteShell>
    );
  }

  // Real per-type availability, counted directly from the workspaces admin
  // configured for this location — not a guessed/hardcoded formula.
  const typeAvailability = location.types.map((type) => {
    const spacesOfType = spaces.filter((w) => w.type === type);
    const count = spacesOfType.filter(
      (w) => w.availability === "available" || w.availability === "limited",
    ).length;
    return { type, count };
  });

  // The hero price should reflect the actual admin-configured price for a
  // Day Pass workspace at this location, when one exists. Falling back to
  // the location's overall cheapest workspace price (priceFrom) otherwise,
  // with a label that matches what's actually being shown.
  const dayPassSpaces = spaces.filter((w) => w.type === "Day Pass" && w.price > 0);
  const heroPrice = dayPassSpaces.length
    ? Math.min(...dayPassSpaces.map((w) => w.price))
    : location.priceFrom;
  const heroLabel = dayPassSpaces.length
    ? locale === "id"
      ? "Tiket harian mulai"
      : "Day pass from"
    : locale === "id"
      ? "Mulai dari"
      : "Starting from";

  return (
    <SiteShell>
      <section className="border-b border-border bg-surface">
        <div className="container-page py-10">
          <nav className="text-xs font-semibold text-muted-foreground">
            <span>{t("nav.locations")}</span>
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
                <Clock className="size-4 text-primary" /> {location.hours}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <AvailabilityBadge status={location.availability} />
                {location.access247 ? (
                  <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
                    {locale === "id"
                      ? "Akses 24/7 untuk anggota"
                      : "24/7 access for resident members"}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              <p className="text-xs text-muted-foreground">{heroLabel}</p>
              <p className="text-2xl font-bold text-foreground">{money(heroPrice)}</p>
              <Button asChild size="lg" className="mt-4 w-full bg-galaxy-accent font-semibold">
                <Link to="/workspaces" search={{ location: location.slug }}>
                  {t("cta.book")}
                </Link>
              </Button>
              <p className="mt-3 text-[11px] text-muted-foreground">
                {locale === "id"
                  ? "Kredensial akses pintar otomatis aktif."
                  : "Access is included with every booking."}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 lg:grid-cols-[2fr_1fr]">
            <img
              src={location.image}
              alt={`Workspace at ${location.name}`}
              loading="lazy"
              width={1200}
              height={800}
              className="h-[320px] w-full rounded-2xl object-cover md:h-[420px]"
            />
            <div className="grid gap-3">
              <img
                src={location.image}
                alt={`Shared area at ${location.name}`}
                loading="lazy"
                width={1200}
                height={800}
                className="hidden h-[204px] w-full rounded-2xl object-cover object-right lg:block"
              />
              {location.latitude != null && location.longitude != null ? (
                <LocationMap
                  latitude={location.latitude}
                  longitude={location.longitude}
                  name={location.name}
                  locale={locale}
                />
              ) : (
                <div className="relative h-[204px] overflow-hidden rounded-2xl border border-border bg-surface">
                  <div className="absolute inset-0 bg-[linear-gradient(oklch(0.895_0.01_95)_1px,transparent_1px),linear-gradient(90deg,oklch(0.895_0.01_95)_1px,transparent_1px)] bg-[size:36px_36px]" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-soft)]">
                    <MapPin className="mr-1 inline size-3.5 text-primary" />
                    {location.city}
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted-foreground">
            {location.description}
          </p>
        </div>
      </section>

      <section className="container-page py-12">
        <h2 className="text-h2 font-bold">
          {locale === "id" ? "Ketersediaan Hari Ini" : "Workspace availability today"}
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {typeAvailability.map(({ type, count }) => (
            <div
              key={type}
              className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 shadow-[var(--shadow-soft)]"
            >
              <span className="text-xs font-bold text-foreground">{type}</span>
              <AvailabilityBadge
                status={count === 0 ? "full" : count <= 3 ? "limited" : "available"}
                label={
                  count === 0
                    ? locale === "id"
                      ? "Penuh"
                      : "Fully booked"
                    : `${count} ${locale === "id" ? "tersedia" : "available"}`
                }
              />
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface py-12">
        <div className="container-page">
          <h2 className="text-h2 font-bold">
            {locale === "id" ? "Fasilitas Gedung" : "Facilities"}
          </h2>
          <div className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {location.amenities.map((a) => (
              <div
                key={a}
                className="flex items-center gap-2.5 border-t border-border pt-4 text-xs font-medium text-foreground"
              >
                <Wifi className="size-4 text-primary" />
                {a}
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <ShieldCheck className="mt-0.5 size-5 text-primary" />
            <div>
              <h3 className="text-xs font-bold text-foreground">
                {locale === "id"
                  ? "Akses Pintar Mandiri Termasuk"
                  : "Access included with your booking"}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {locale === "id"
                  ? "Pintu masuk mendukung QR Pass dan tombol proximity geolocation (radius ≤ 50m). Kredensial aktif otomatis begitu pembayaran terkonfirmasi."
                  : "Entrance supports QR Pass and proximity door unlock button (radius ≤ 50m). Credentials activate automatically upon confirmed payment."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {spaces.length > 0 && (
        <section className="container-page py-12">
          <h2 className="text-h2 font-bold">
            {locale === "id" ? "Ruangan di Lokasi Ini" : "Spaces at this location"}
          </h2>
          <div className="mt-6 grid gap-4">
            {spaces.map((w) => (
              <WorkspaceCard key={w.id} workspace={w} />
            ))}
          </div>
        </section>
      )}
    </SiteShell>
  );
}

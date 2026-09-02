import { Link } from "@tanstack/react-router";
import { MapPin, Clock, Building2 } from "lucide-react";
import { Button } from "@/frontend/ui/button";
import { AvailabilityBadge } from "./availability-badge";
import { type Location, type Workspace, usePublicCatalog } from "@/frontend/data/catalog";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export function LocationCard({ location }: { location: Location }) {
  const { money, locale } = useI18n();
  return (
    <article className="hover-glow group overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={location.image}
          alt={`Interior of ${location.name}`}
          loading="lazy"
          width={1200}
          height={800}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          <AvailabilityBadge status={location.availability} className="bg-card/95 backdrop-blur" />
          {location.access247 ? (
            <span className="rounded-full border border-border bg-card/95 px-2.5 py-1 text-xs font-medium backdrop-blur">
              {locale === "id" ? "Akses 24/7" : "24/7 access"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-base font-bold text-foreground">{location.name}</h3>
        <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
          {location.address}, {location.city}
        </p>

        <dl className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-surface p-3 text-center">
          <div>
            <dt className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              {locale === "id" ? "Meja" : "Desks"}
            </dt>
            <dd className="text-xs font-bold text-foreground">
              {location.desksAvailable} {locale === "id" ? "kosong" : "free"}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              {locale === "id" ? "Ruangan" : "Rooms"}
            </dt>
            <dd className="text-xs font-bold text-foreground">
              {location.roomsAvailable} {locale === "id" ? "kosong" : "free"}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              {locale === "id" ? "Terisi" : "Occupancy"}
            </dt>
            <dd className="text-xs font-bold text-foreground">{location.occupancy}%</dd>
          </div>
        </dl>

        <p className="mt-4 flex flex-wrap gap-1.5">
          {location.amenities.slice(0, 4).map((a) => (
            <span key={a} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              {a}
            </span>
          ))}
        </p>

        <div className="mt-5 flex items-end justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            {locale === "id" ? "Mulai dari " : "From "}
            <span className="text-base font-bold text-foreground">
              {money(location.priceFrom)}
            </span>{" "}
            / {locale === "id" ? "hari" : "day"}
          </p>
          <Button asChild size="sm" variant="outline" className="font-medium">
            <Link to="/locations/$slug" params={{ slug: location.slug }}>
              {locale === "id" ? "Lihat Lokasi" : "View Location"}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function WorkspaceCard({ workspace }: { workspace: Workspace }) {
  const { money, t, locale } = useI18n();
  const { session } = useAuth();
  const { locations } = usePublicCatalog();
  const location = locations.find((l) => l.slug === workspace.locationSlug);
  const bookable = workspace.availability !== "full" && workspace.availability !== "unavailable";

  return (
    <article className="hover-glow flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:flex-row">
      <img
        src={workspace.image}
        alt={workspace.name}
        loading="lazy"
        width={1200}
        height={800}
        className="h-44 w-full rounded-xl object-cover sm:h-auto sm:w-60 border border-border"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {workspace.type}
          </span>
          <AvailabilityBadge status={workspace.availability} />
        </div>

        <h3 className="mt-2 text-lg font-bold text-foreground">{workspace.name}</h3>
        <div className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {location ? (
              <span className="flex items-center gap-1.5">
                <Building2 className="size-3.5 text-primary" /> {location.name}
              </span>
            ) : null}
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5 text-primary" /> {workspace.floor}
            </span>
          </p>
          {location ? (
            <p className="pl-5 text-muted-foreground/80">
              {location.address}, {location.city}
            </p>
          ) : null}
        </div>

        <p className="mt-3 flex flex-wrap gap-1.5">
          {workspace.amenities.slice(0, 4).map((a) => (
            <span
              key={a}
              className="rounded-md bg-muted px-2.5 py-1 text-[11px] text-muted-foreground font-medium"
            >
              ✓ {a}
            </span>
          ))}
        </p>

        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5 text-primary" />
          {locale === "id"
            ? "Jadwal operasional: 08:00 – 17:00 (Pilih jam & menit fleksibel)"
            : "Operating hours: 8:00 AM – 5:00 PM (Custom start & end time)"}
        </p>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            <span className="text-xl font-bold text-foreground">{money(workspace.price)}</span> /{" "}
            {t("common.hour")}
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="font-medium">
              <Link to="/workspaces/$id" params={{ id: workspace.id }}>
                {t("cta.details")}
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-galaxy-accent font-semibold"
              disabled={!bookable}
            >
              {session ? (
                <Link to="/workspaces/$id" params={{ id: workspace.id }}>
                  {bookable ? t("cta.book") : "Unavailable"}
                </Link>
              ) : (
                <Link to="/login" search={{ redirect: `/workspaces/${workspace.id}` }}>
                  {bookable ? t("cta.book") : "Unavailable"}
                </Link>
              )}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

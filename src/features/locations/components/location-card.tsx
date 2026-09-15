import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvailabilityBadge } from "@/features/workspaces";
import { formatMoney } from "@/shared/format";
import type { LocationListItemDto } from "../locations.types";

export function LocationCard({ location }: { location: LocationListItemDto }) {
  return (
    <article className="hover-glow group overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
      <div className="relative aspect-[16/10] overflow-hidden">
        {location.imageUrl ? (
          <img
            src={location.imageUrl}
            alt={`Interior of ${location.name}`}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="size-full bg-muted" />
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          <AvailabilityBadge
            status={location.stats.availability}
            className="bg-card/95 backdrop-blur"
          />
          {location.access247 ? (
            <span className="rounded-full border border-border bg-card/95 px-2.5 py-1 text-xs font-medium backdrop-blur">
              24/7 access
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
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Desks
            </dt>
            <dd className="text-xs font-bold text-foreground">
              {location.stats.desksAvailable} free
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Rooms
            </dt>
            <dd className="text-xs font-bold text-foreground">
              {location.stats.roomsAvailable} free
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Occupancy
            </dt>
            <dd className="text-xs font-bold text-foreground">{location.stats.occupancy}%</dd>
          </div>
        </dl>

        <p className="mt-4 flex flex-wrap gap-1.5">
          {location.amenities.slice(0, 4).map((amenity) => (
            <span
              key={amenity.id}
              className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
            >
              {amenity.name}
            </span>
          ))}
        </p>

        <div className="mt-5 flex items-end justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            From{" "}
            <span className="text-base font-bold text-foreground">
              {formatMoney(location.stats.priceFrom)}
            </span>{" "}
            / hour
          </p>
          <Button asChild size="sm" variant="outline" className="font-medium">
            <Link to="/locations/$slug" params={{ slug: location.slug }}>
              View location
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

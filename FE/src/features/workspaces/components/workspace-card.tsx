import { Link } from "@tanstack/react-router";
import { Building2, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth";
import { formatMoney } from "@/shared/format";
import type { WorkspaceAvailability, WorkspaceType } from "../workspaces.types";
import { AvailabilityBadge } from "./availability-badge";

/**
 * Narrower than `WorkspaceListItemDto` on purpose: a location detail's
 * embedded workspace summaries don't carry a nested `location` (they're
 * already scoped to one) — this is exactly the shape both call sites
 * genuinely have in common.
 */
export type WorkspaceCardData = {
  id: string;
  name: string;
  type: WorkspaceType;
  floor: string;
  pricePerHour: string;
  availability: WorkspaceAvailability;
  imageUrl: string | null;
  amenities: Array<{ id: string; name: string }>;
  location: { name: string; address: string; city: string };
};

export function WorkspaceCard({ workspace }: { workspace: WorkspaceCardData }) {
  const { data } = useSession();
  const bookable = workspace.availability === "available" || workspace.availability === "limited";

  return (
    <article className="hover-glow flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:flex-row">
      {workspace.imageUrl ? (
        <img
          src={workspace.imageUrl}
          alt={workspace.name}
          loading="lazy"
          className="h-44 w-full rounded-xl border border-border object-cover sm:h-auto sm:w-60"
        />
      ) : (
        <div className="h-44 w-full rounded-xl border border-border bg-muted sm:h-auto sm:w-60" />
      )}

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
            <span className="flex items-center gap-1.5">
              <Building2 className="size-3.5 text-primary" /> {workspace.location.name}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5 text-primary" /> {workspace.floor}
            </span>
          </p>
          <p className="pl-5 text-muted-foreground/80">
            {workspace.location.address}, {workspace.location.city}
          </p>
        </div>

        <p className="mt-3 flex flex-wrap gap-1.5">
          {workspace.amenities.slice(0, 4).map((amenity) => (
            <span
              key={amenity.id}
              className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
            >
              ✓ {amenity.name}
            </span>
          ))}
        </p>

        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5 text-primary" />
          Custom start &amp; end time, within the location's opening hours.
        </p>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            <span className="text-xl font-bold text-foreground">
              {formatMoney(workspace.pricePerHour)}
            </span>{" "}
            / hour
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="font-medium">
              <Link to="/workspaces/$id" params={{ id: workspace.id }}>
                Details
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="bg-galaxy-accent font-semibold"
              disabled={!bookable}
            >
              {data?.session ? (
                <Link to="/workspaces/$id" params={{ id: workspace.id }}>
                  {bookable ? "Book" : "Unavailable"}
                </Link>
              ) : (
                <Link to="/login">{bookable ? "Book" : "Unavailable"}</Link>
              )}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

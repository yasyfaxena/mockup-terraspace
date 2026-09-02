import { MapPin } from "lucide-react";
import { googleMapsEmbedUrl, googleMapsUrl } from "@/lib/geocoding";

/**
 * Read-only map preview for a location's coordinates. Embeds Google Maps directly via
 * its key-less iframe embed (maps.google.com/maps?...&output=embed) — no map SDK, no
 * billed API key needed — plus a link out to the same point in Google Maps.
 */
export function LocationMap({
  latitude,
  longitude,
  name,
  locale,
}: {
  latitude: number | null;
  longitude: number | null;
  name: string;
  locale: "id" | "en";
}) {
  if (latitude == null || longitude == null) return null;

  return (
    <div className="relative h-[204px] w-full overflow-hidden rounded-2xl border border-border">
      <iframe
        src={googleMapsEmbedUrl(latitude, longitude)}
        title={`Map — ${name}`}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        className="h-full w-full"
      />
      <a
        href={googleMapsUrl(latitude, longitude)}
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-2 right-2 z-[400] flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground shadow-[var(--shadow-soft)] hover:bg-surface"
      >
        <MapPin className="size-3 text-primary" />
        {locale === "id" ? "Buka di Google Maps" : "Open in Google Maps"}
      </a>
    </div>
  );
}

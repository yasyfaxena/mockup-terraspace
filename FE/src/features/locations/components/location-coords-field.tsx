import { MapPin } from "lucide-react";
import { googleMapsUrl } from "@/shared/geocoding";

const labelCls = "text-xs font-semibold text-foreground";
const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

/**
 * Manual latitude/longitude entry, with a shortcut to open the point in
 * Google Maps to double-check it. No map SDK — the admin looks the
 * coordinates up themselves (locations.md §6).
 */
export function LocationCoordsField({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number | null;
  longitude: number | null;
  onChange: (result: { latitude: number | null; longitude: number | null }) => void;
}) {
  function parseCoord(value: string): number | null {
    if (value.trim() === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  return (
    <div className="grid gap-2 rounded-lg border border-border bg-muted/20 p-3">
      <span className={labelCls}>Location coordinates</span>

      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Latitude</span>
          <input
            type="number"
            step="any"
            value={latitude ?? ""}
            onChange={(event) => onChange({ latitude: parseCoord(event.target.value), longitude })}
            placeholder="-6.200000"
            className={inputCls}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-medium text-muted-foreground">Longitude</span>
          <input
            type="number"
            step="any"
            value={longitude ?? ""}
            onChange={(event) => onChange({ latitude, longitude: parseCoord(event.target.value) })}
            placeholder="106.800000"
            className={inputCls}
          />
        </label>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Look the spot up on Google Maps, right-click the point, and copy the lat/long here.
      </p>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono text-[11px]">
          {latitude != null && longitude != null
            ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            : "No coordinates yet"}
        </span>
        {latitude != null && longitude != null && (
          <a
            href={googleMapsUrl(latitude, longitude)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            <MapPin className="size-3" />
            Open in Google Maps ↗
          </a>
        )}
      </div>
    </div>
  );
}

import { MapPin } from "lucide-react";
import { googleMapsUrl } from "@/lib/geocoding";
import { labelCls, inputCls } from "@/frontend/admin/admin-form-fields";

/**
 * Manual latitude/longitude entry for a location, with a shortcut to open the point
 * in Google Maps to double-check it. No map SDK — the admin looks the coordinates up
 * themselves (e.g. by right-clicking the spot in Google Maps and copying the numbers)
 * and types the address/city in separately.
 */
export function LocationCoordsField({
  isId,
  latitude,
  longitude,
  onChange,
}: {
  isId?: boolean;
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
    <div className="grid gap-1.5">
      <span className={labelCls}>{isId ? "Koordinat lokasi" : "Location coordinates"}</span>

      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1">
          <span className="text-[10px] normal-case text-white/35">
            {isId ? "Lintang (latitude)" : "Latitude"}
          </span>
          <input
            type="number"
            step="any"
            value={latitude ?? ""}
            onChange={(event) =>
              onChange({ latitude: parseCoord(event.target.value), longitude })
            }
            placeholder="-6.200000"
            className={inputCls}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-[10px] normal-case text-white/35">
            {isId ? "Bujur (longitude)" : "Longitude"}
          </span>
          <input
            type="number"
            step="any"
            value={longitude ?? ""}
            onChange={(event) =>
              onChange({ latitude, longitude: parseCoord(event.target.value) })
            }
            placeholder="106.800000"
            className={inputCls}
          />
        </label>
      </div>

      <p className="text-[10px] text-white/25">
        {isId
          ? "Cari lokasinya di Google Maps, klik kanan titiknya, lalu salin angka lat/long ke sini."
          : "Look the spot up on Google Maps, right-click the point, and copy the lat/long here."}
      </p>

      <div className="flex items-center justify-between text-[11px] text-white/35">
        <span>
          {latitude != null && longitude != null
            ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            : isId
              ? "Belum ada koordinat"
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
            {isId ? "Buka di Google Maps ↗" : "Open in Google Maps ↗"}
          </a>
        )}
      </div>
    </div>
  );
}

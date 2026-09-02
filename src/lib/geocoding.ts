/**
 * Google Maps helpers for a stored latitude/longitude pair.
 *
 * Locations store lat/lng (entered manually in the admin) plus a manually-typed
 * address/city — no geocoding service or map SDK involved. These two helpers just
 * turn coordinates into Google Maps links: one to open the point in Google Maps,
 * and one to embed a live map for it. Both work without a billed Google Maps API key.
 */

/** Deep link to open a coordinate directly in Google Maps. */
export function googleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

/** src for an <iframe> that embeds a live Google Maps view centered on a coordinate. */
export function googleMapsEmbedUrl(latitude: number, longitude: number, zoom = 15): string {
  return `https://maps.google.com/maps?q=${latitude},${longitude}&z=${zoom}&output=embed`;
}

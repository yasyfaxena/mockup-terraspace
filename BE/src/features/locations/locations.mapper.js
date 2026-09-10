import { DESK_TYPES } from "../../shared/constants/workspace.js";

const MONEY_DECIMAL_PLACES = 2;
const COORDINATE_DECIMAL_PLACES = 6;
const OCCUPANCY_PERCENT = 100;

/**
 * @param {unknown} value
 * @returns {string}
 */
function toMoneyString(value) {
  if (value === null || value === undefined) return "0.00";
  return Number(value).toFixed(MONEY_DECIMAL_PLACES);
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function toCoordinateString(value) {
  return value === null || value === undefined
    ? null
    : Number(value).toFixed(COORDINATE_DECIMAL_PLACES);
}

/**
 * Reduces a location's own workspaces into the same shape the list
 * endpoint's SQL aggregate produces — used only for the detail endpoint,
 * where fetching one location's workspaces in a single query is already
 * cheap enough that a second SQL round trip would be pure overhead.
 * @param {Array<{ type: string, availability: string, pricePerHour: unknown }>} workspaces
 * @returns {{ desksTotal: number, desksAvailable: number, roomsTotal: number, roomsAvailable: number, priceFrom: number, types: string[] }}
 */
export function computeWorkspaceStats(workspaces) {
  let desksTotal = 0;
  let desksAvailable = 0;
  let roomsTotal = 0;
  let roomsAvailable = 0;
  let priceFrom = 0;
  const types = new Set();

  for (const workspace of workspaces) {
    const isDesk = DESK_TYPES.includes(workspace.type);
    const isAvailable = workspace.availability === "available";
    if (isDesk) {
      desksTotal += 1;
      if (isAvailable) desksAvailable += 1;
    } else {
      roomsTotal += 1;
      if (isAvailable) roomsAvailable += 1;
    }
    types.add(workspace.type);

    const price = Number(workspace.pricePerHour);
    if (price > 0 && (priceFrom === 0 || price < priceFrom)) priceFrom = price;
  }

  return { desksTotal, desksAvailable, roomsTotal, roomsAvailable, priceFrom, types: [...types] };
}

/**
 * The `desksTotal`/`roomsTotal`/... shape, from either the list endpoint's
 * SQL row or {@link computeWorkspaceStats}, into the public `stats` DTO.
 * @param {{ desksTotal: number, desksAvailable: number, roomsTotal: number, roomsAvailable: number, priceFrom: unknown, types: string[] }} row
 * @returns {import("./locations.types.js").LocationStatsDto}
 */
export function toStatsDto(row) {
  const total = row.desksTotal + row.roomsTotal;
  const available = row.desksAvailable + row.roomsAvailable;
  const occupancy = total > 0 ? Math.round(((total - available) / total) * OCCUPANCY_PERCENT) : 0;
  /** @type {"available" | "limited" | "unavailable"} */
  let availability = "limited";
  if (available === 0) {
    availability = "unavailable";
  } else if (available === total) {
    availability = "available";
  }

  return {
    desksTotal: row.desksTotal,
    desksAvailable: row.desksAvailable,
    roomsTotal: row.roomsTotal,
    roomsAvailable: row.roomsAvailable,
    occupancy,
    priceFrom: toMoneyString(row.priceFrom),
    types: row.types,
    availability,
  };
}

/**
 * @param {import("@prisma/client").Amenity} amenity
 * @returns {{ id: string, name: string, nameId: string | null, category: string, icon: string }}
 */
export function toAmenitySummaryDto(amenity) {
  return {
    id: amenity.id,
    name: amenity.name,
    nameId: amenity.nameId,
    category: amenity.category,
    icon: amenity.icon,
  };
}

/**
 * @param {any} row a row from LocationsRepository#findActivePublic
 * @param {import("@prisma/client").Amenity[]} amenities
 * @returns {import("./locations.types.js").LocationListItemDto}
 */
export function toLocationListDto(row, amenities) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    address: row.address,
    city: row.city,
    imageUrl: row.imageUrl,
    openingHours: row.openingHours,
    access247: row.access247,
    description: row.description,
    latitude: toCoordinateString(row.latitude),
    longitude: toCoordinateString(row.longitude),
    timezone: row.timezone,
    amenities: amenities.map(toAmenitySummaryDto),
    stats: toStatsDto(row),
  };
}

/**
 * @param {import("@prisma/client").Workspace & { workspaceAmenities: Array<{ amenity: import("@prisma/client").Amenity }> }} workspace
 * @returns {object}
 */
function toWorkspaceSummaryDto(workspace) {
  return {
    id: workspace.id,
    name: workspace.name,
    type: workspace.type,
    floor: workspace.floor,
    pricePerHour: toMoneyString(workspace.pricePerHour),
    currency: null, // filled in by the service, which knows adminSettings.currency
    availability: workspace.availability,
    imageUrl: workspace.imageUrl,
    simpleBooking: workspace.simpleBooking,
    amenities: workspace.workspaceAmenities.map((link) => ({
      id: link.amenity.id,
      name: link.amenity.name,
      icon: link.amenity.icon,
    })),
  };
}

/**
 * @param {import("@prisma/client").Location & {
 *   locationAmenities: Array<{ amenity: import("@prisma/client").Amenity }>,
 *   workspaces: Array<import("@prisma/client").Workspace & { workspaceAmenities: Array<{ amenity: import("@prisma/client").Amenity }> }>,
 * }} location
 * @param {string} currency
 * @returns {object}
 */
export function toLocationDetailDto(location, currency) {
  const listShape = toLocationListDto(
    { ...location, ...computeWorkspaceStats(location.workspaces) },
    location.locationAmenities.map((link) => link.amenity),
  );

  return {
    ...listShape,
    accessRadiusMeters: location.accessRadiusMeters,
    workspaces: location.workspaces
      .filter((workspace) => workspace.availability !== "disabled")
      .map((workspace) => ({ ...toWorkspaceSummaryDto(workspace), currency })),
  };
}

/**
 * @param {import("@prisma/client").Location & {
 *   _count?: { workspaces: number },
 *   locationAmenities?: Array<{ amenityId: string }>,
 * }} location
 * @returns {import("./locations.types.js").AdminLocationDto}
 */
export function toAdminLocationDto(location) {
  return {
    id: location.id,
    slug: location.slug,
    name: location.name,
    address: location.address,
    city: location.city,
    imageUrl: location.imageUrl,
    openingHours: location.openingHours,
    access247: location.access247,
    description: location.description,
    latitude: toCoordinateString(location.latitude),
    longitude: toCoordinateString(location.longitude),
    accessRadiusMeters: location.accessRadiusMeters,
    timezone: location.timezone,
    status: location.status,
    workspaceCount: location._count?.workspaces ?? 0,
    amenityIds: (location.locationAmenities ?? []).map((link) => link.amenityId),
    createdAt: location.createdAt.toISOString(),
    updatedAt: location.updatedAt.toISOString(),
  };
}

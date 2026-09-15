import type { AmenityDto } from "@/features/amenities";
import type { WorkspaceAvailability, WorkspaceType } from "@/features/workspaces";

/** Mirrors BE `locations.mapper.js`'s `toStatsDto`. */
export type LocationStatsDto = {
  desksTotal: number;
  desksAvailable: number;
  roomsTotal: number;
  roomsAvailable: number;
  occupancy: number;
  priceFrom: string;
  types: string[];
  availability: "available" | "limited" | "unavailable";
};

/** Mirrors BE `locations.mapper.js`'s `toLocationListDto`. */
export type LocationListItemDto = {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  imageUrl: string | null;
  openingHours: string;
  access247: boolean;
  description: string;
  latitude: string | null;
  longitude: string | null;
  timezone: string;
  amenities: AmenityDto[];
  stats: LocationStatsDto;
};

type LocationWorkspaceSummaryDto = {
  id: string;
  name: string;
  type: WorkspaceType;
  floor: string;
  pricePerHour: string;
  currency: string;
  availability: WorkspaceAvailability;
  imageUrl: string | null;
  simpleBooking: boolean;
  amenities: Array<{ id: string; name: string; icon: string }>;
};

/** Mirrors BE `locations.mapper.js`'s `toLocationDetailDto`. */
export type LocationDetailDto = LocationListItemDto & {
  accessRadiusMeters: number;
  workspaces: LocationWorkspaceSummaryDto[];
};

/** Mirrors BE `locations.mapper.js`'s `toAdminLocationDto`. */
export type AdminLocationDto = {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  imageUrl: string | null;
  openingHours: string;
  access247: boolean;
  description: string;
  latitude: string | null;
  longitude: string | null;
  accessRadiusMeters: number;
  timezone: string;
  status: "active" | "inactive";
  workspaceCount: number;
  amenityIds: string[];
  createdAt: string;
  updatedAt: string;
};

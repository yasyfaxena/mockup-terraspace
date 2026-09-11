import type { AmenityDto } from "@/features/amenities";

export type WorkspaceType =
  "hot_desk" | "dedicated_desk" | "private_office" | "meeting_room" | "event_space";

export type WorkspaceAvailability = "available" | "limited" | "full" | "maintenance" | "disabled";

type WorkspaceLocationSummary = {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
};

/** Mirrors BE `workspaces.mapper.js`'s `toWorkspaceListDto`. */
export type WorkspaceListItemDto = {
  id: string;
  name: string;
  type: WorkspaceType;
  floor: string;
  pricePerHour: string;
  currency: string;
  availability: WorkspaceAvailability;
  simpleBooking: boolean;
  imageUrl: string | null;
  description: string;
  cancellationPolicy: string;
  amenities: AmenityDto[];
  location: WorkspaceLocationSummary;
};

/** Mirrors BE `workspaces.mapper.js`'s `toWorkspaceDetailDto`. */
export type WorkspaceDetailDto = WorkspaceListItemDto & {
  pricing: {
    pricePerHour: string;
    currency: string;
    taxPercent: string;
    minimumDurationMinutes: number;
    advanceBookingDays: number;
  };
  calendarSyncProvider: string | null;
  qrProvider: string | null;
};

/** A busy or free block, HH:MM strings — never a booking id/reference/name. */
export type AvailabilityInterval = { from: string; to: string };

/** Mirrors BE `workspaces.service.js`'s `getAvailability`. */
export type WorkspaceAvailabilityDto = {
  workspaceId: string;
  date: string;
  openingHours: { from: string; to: string };
  minimumDurationMinutes: number;
  busy: AvailabilityInterval[];
  available: AvailabilityInterval[];
};

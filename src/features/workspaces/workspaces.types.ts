import type { AmenityDto } from "@/features/amenities";

export type WorkspaceType =
  "hot_desk" | "dedicated_desk" | "private_office" | "meeting_room" | "event_space";

/**
 * Single source of truth for turning a `WorkspaceType` slug into copy a
 * user should actually see. Anywhere the raw enum value used to be
 * rendered directly (e.g. `{workspace.type}`) should go through
 * `workspaceTypeLabel()` instead — the slug is a wire value, not display
 * text.
 */
export const WORKSPACE_TYPE_LABELS: Record<WorkspaceType, string> = {
  hot_desk: "Hot desk",
  dedicated_desk: "Dedicated desk",
  private_office: "Private office",
  meeting_room: "Meeting room",
  event_space: "Event space",
};

export function workspaceTypeLabel(type: WorkspaceType | string): string {
  return WORKSPACE_TYPE_LABELS[type as WorkspaceType] ?? type;
}

export const WORKSPACE_TYPE_OPTIONS: { value: WorkspaceType; label: string }[] = (
  Object.keys(WORKSPACE_TYPE_LABELS) as WorkspaceType[]
).map((value) => ({ value, label: WORKSPACE_TYPE_LABELS[value] }));

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

/** Mirrors BE `workspaces.mapper.js`'s `toAdminWorkspaceDto`. */
export type AdminWorkspaceDto = {
  id: string;
  locationId: string;
  name: string;
  type: WorkspaceType;
  floor: string;
  pricePerHour: string;
  availability: WorkspaceAvailability;
  simpleBooking: boolean;
  imageUrl: string | null;
  description: string;
  cancellationPolicy: string;
  calendarSyncProvider: string | null;
  qrProvider: string | null;
  amenityIds: string[];
  activeBookingCount: number;
  location: { id: string; name: string; slug: string };
  createdAt: string;
  updatedAt: string;
};

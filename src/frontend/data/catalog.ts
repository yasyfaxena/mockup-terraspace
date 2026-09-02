import { useEffect, useState } from "react";
import { getPublicCatalog } from "@/backend";
import { APP_CONFIG } from "@/shared/constants";
import { formatMoney } from "@/lib/i18n";

export const CATALOG_LIMITS = {
  locationAmenitiesPreview: 4,
  workspaceAmenitiesPreview: 4,
} as const;

export const BOOKING_DEFAULTS = {
  localeCurrency: APP_CONFIG.currency,
  unit: "hour",
  openingTime: APP_CONFIG.defaultBookingStart,
  closingTime: APP_CONFIG.defaultBookingEnd,
} as const;

export const AVAILABILITY = {
  available: "available",
  limited: "limited",
  full: "full",
  unavailable: "unavailable",
} as const;

export type Availability = (typeof AVAILABILITY)[keyof typeof AVAILABILITY];
export type WorkspaceType = string;

export type Location = {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  image: string;
  hours: string;
  access247: boolean;
  desksAvailable: number;
  desksTotal: number;
  roomsAvailable: number;
  roomsTotal: number;
  occupancy: number;
  amenities: string[];
  priceFrom: number;
  availability: Availability;
  types: WorkspaceType[];
  description: string;
  latitude: number | null;
  longitude: number | null;
  accessRadiusMeters: number;
  status: string;
};

export type Workspace = {
  id: string;
  name: string;
  type: WorkspaceType;
  locationSlug: string;
  floor: string;
  price: number;
  unit: string;
  amenities: string[];
  availability: string;
  slots: string[];
  image: string;
  description: string;
  cancellation: string;
  simpleBooking: boolean;
  calendarSync: string | null;
  qrProvider: string | null;
};

export type Amenity = {
  id: string;
  name: string;
  nameId: string;
  category: string;
  icon: string;
  status?: string;
  detail?: string;
};

export type Plan = {
  name: string;
  price: number;
  period: string;
  summary: string;
  benefits: string[];
};

export const availabilityLabel: Record<Availability, string> = {
  available: "Available",
  limited: "Limited availability",
  full: "Fully booked",
  unavailable: "Temporarily unavailable",
};

export function toPublicAvailability(value: string): Availability {
  if (value === AVAILABILITY.available) return AVAILABILITY.available;
  if (value === AVAILABILITY.limited) return AVAILABILITY.limited;
  if (value === AVAILABILITY.full) return AVAILABILITY.full;
  return AVAILABILITY.unavailable;
}

export function getPlans(workspaces: Workspace[]): Plan[] {
  return workspaces.map((workspace) => ({
    name: workspace.name,
    price: workspace.price,
    period: `per ${workspace.unit}`,
    summary: "Pay-per-booking. No membership or subscription required.",
    benefits: workspace.amenities,
  }));
}

/** Formats a base amount as USD for display. TerraSpace is USD-only. */
export function formatUSD(value: number): string {
  return formatMoney(value);
}

const EMPTY_CATALOG = {
  locations: [] as Location[],
  workspaces: [] as Workspace[],
  amenities: [] as Amenity[],
  plans: [] as Plan[],
};

export function usePublicCatalog() {
  const [catalog, setCatalog] = useState(EMPTY_CATALOG);

  useEffect(() => {
    let active = true;
    void getPublicCatalog()
      .then((remote) => {
        if (!active) return;
        const locations = remote.locations.map((location) => ({
          ...location,
          image: location.image ?? "",
          desksAvailable: location.desksAvailable ?? 0,
          desksTotal: location.desksTotal ?? 0,
          roomsAvailable: location.roomsAvailable ?? 0,
          roomsTotal: location.roomsTotal ?? 0,
          occupancy: location.occupancy ?? 0,
          priceFrom: location.priceFrom ?? 0,
          types: location.types ?? [],
        }));
        const workspaces = remote.workspaces.map((workspace) => ({
          ...workspace,
          image: workspace.image ?? "",
        }));
        const amenities = remote.amenities.map((amenity) => ({
          ...amenity,
        }));
        setCatalog({
          locations,
          workspaces,
          amenities,
          plans: getPlans(workspaces),
        });
      })
      .catch(() => {
        if (active) setCatalog(EMPTY_CATALOG);
      });

    return () => {
      active = false;
    };
  }, []);

  return catalog;
}

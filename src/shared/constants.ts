export const APP_CONFIG = {
  brandName: "TerraSpace",
  currency: "USD",
  defaultLocationHours: "Mon–Sun 09:00–22:00",
  defaultAccessRadiusMeters: 50,
  bookingAccessBufferMinutes: 30,
  minimumBookingDurationMinutes: 30,
  defaultBookingStart: "09:00",
  defaultBookingEnd: "11:00",
  maxGuestsPerBooking: 8,
  defaultPaymentMethod: "card",
  defaultBookingStatus: "confirmed",
  bookingReferencePrefix: "SB-",
  accessCodePrefix: "TERRASPACE",
} as const;

export const CATALOG_STATUS = {
  active: "active",
  inactive: "inactive",
} as const;

export const WORKSPACE_AVAILABILITY = {
  available: "available",
  limited: "limited",
  full: "full",
  maintenance: "maintenance",
  disabled: "disabled",
} as const;

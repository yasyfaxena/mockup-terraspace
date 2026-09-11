import { http, HttpResponse } from "msw";

const API_BASE = "http://localhost:3000";

export function buildPublicSettings(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    companyName: "TerraSpace",
    supportEmail: "hello@terraspace.test",
    currency: "IDR",
    currencyExponent: 0,
    taxPercent: "11.00",
    cancellationWindowHours: 24,
    advanceBookingDays: 30,
    minimumBookingDurationMinutes: 30,
    bookingAccessBufferMinutes: 30,
    ...overrides,
  };
}

export const settingsHandlers = [
  http.get(`${API_BASE}/api/v1/settings/public`, () => HttpResponse.json(buildPublicSettings())),
];

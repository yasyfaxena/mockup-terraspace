import { CURRENCY_EXPONENT } from "../../shared/lib/money.js";
import { MINIMUM_BOOKING_MINUTES, ACCESS_BUFFER_MINUTES } from "../../shared/constants/hours.js";

const TAX_PERCENT_DECIMALS = 2;

/**
 * The booking UI's subset (settings.md §1) — `minimumBookingDurationMinutes`
 * and `bookingAccessBufferMinutes` are platform-wide constants, not
 * `admin_settings` columns (the schema has no per-venue schedule yet), so
 * they are folded in here rather than read from the row.
 * @param {import("@prisma/client").AdminSettings} settings
 * @returns {import("./settings.types.js").PublicSettingsDto}
 */
export function toPublicSettingsDto(settings) {
  return {
    companyName: settings.companyName,
    supportEmail: settings.supportEmail,
    currency: settings.currency,
    currencyExponent: CURRENCY_EXPONENT[settings.currency],
    taxPercent: settings.taxPercent.toFixed(TAX_PERCENT_DECIMALS),
    cancellationWindowHours: settings.cancellationWindowHours,
    advanceBookingDays: settings.advanceBookingDays,
    minimumBookingDurationMinutes: MINIMUM_BOOKING_MINUTES,
    bookingAccessBufferMinutes: ACCESS_BUFFER_MINUTES,
  };
}

/**
 * @param {import("@prisma/client").AdminSettings} settings
 * @returns {import("./settings.types.js").AdminSettingsDto}
 */
export function toAdminSettingsDto(settings) {
  return {
    companyName: settings.companyName,
    supportEmail: settings.supportEmail,
    currency: settings.currency,
    taxPercent: settings.taxPercent.toFixed(TAX_PERCENT_DECIMALS),
    cancellationWindowHours: settings.cancellationWindowHours,
    advanceBookingDays: settings.advanceBookingDays,
    emailNotificationsEnabled: settings.emailNotificationsEnabled,
    updatedAt: settings.updatedAt.toISOString(),
  };
}

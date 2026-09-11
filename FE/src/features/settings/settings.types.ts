/**
 * Mirrors BE `settings.mapper.js`'s `toPublicSettingsDto`. Public-only for
 * now — the admin read/write side (`AdminSettingsDto`, the settings form)
 * is Phase 7's own scope; this exists early because Phase 5's pricing
 * mirror and cancellation-window display both need `taxPercent`/
 * `cancellationWindowHours`.
 */
export type PublicSettingsDto = {
  companyName: string;
  supportEmail: string;
  currency: string;
  currencyExponent: number;
  taxPercent: string;
  cancellationWindowHours: number;
  advanceBookingDays: number;
  minimumBookingDurationMinutes: number;
  bookingAccessBufferMinutes: number;
};

/**
 * Mirrors BE `settings.mapper.js`'s `toAdminSettingsDto` — the read/write
 * side, admin-only. `taxPercent` stays a decimal string (matches every
 * other money-adjacent field in the API).
 */
export type AdminSettingsDto = {
  companyName: string;
  supportEmail: string | null;
  currency: string;
  taxPercent: string;
  cancellationWindowHours: number;
  advanceBookingDays: number;
  emailNotificationsEnabled: boolean;
  updatedAt: string;
};

/**
 * Mirrors BE `shared/lib/money.js`'s `CURRENCY_EXPONENT` — the only
 * currencies PayBridge can actually charge (settings.schema.js's
 * `currencySchema` rejects anything else). IDR/JPY have no minor unit;
 * charging them as if they had cents would overcharge 100x.
 */
export const CURRENCY_EXPONENT: Record<string, number> = {
  IDR: 0,
  JPY: 0,
  USD: 2,
  SGD: 2,
  MYR: 2,
  EUR: 2,
};

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_EXPONENT) as readonly string[];

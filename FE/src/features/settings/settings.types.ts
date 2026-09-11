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

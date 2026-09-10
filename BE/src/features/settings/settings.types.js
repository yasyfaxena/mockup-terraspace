/**
 * @typedef {object} PublicSettingsDto
 * @property {string} companyName
 * @property {string | null} supportEmail
 * @property {string} currency
 * @property {number} currencyExponent
 * @property {string} taxPercent
 * @property {number} cancellationWindowHours
 * @property {number} advanceBookingDays
 * @property {number} minimumBookingDurationMinutes
 * @property {number} bookingAccessBufferMinutes
 */

/**
 * @typedef {object} AdminSettingsDto
 * @property {string} companyName
 * @property {string | null} supportEmail
 * @property {string} currency
 * @property {string} taxPercent
 * @property {number} cancellationWindowHours
 * @property {number} advanceBookingDays
 * @property {boolean} emailNotificationsEnabled
 * @property {string} updatedAt
 */

export {};

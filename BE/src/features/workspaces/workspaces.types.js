/**
 * @typedef {object} WorkspaceListItemDto
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {string} floor
 * @property {string} pricePerHour
 * @property {string} currency
 * @property {string} availability
 * @property {boolean} simpleBooking
 * @property {string | null} imageUrl
 * @property {string} description
 * @property {string} cancellationPolicy
 * @property {Array<{ id: string, name: string, nameId: string | null, category: string, icon: string }>} amenities
 * @property {{ id: string, slug: string, name: string, address: string, city: string }} location
 */

/**
 * @typedef {object} AvailabilityDto
 * @property {string} workspaceId
 * @property {string} date
 * @property {import("../bookings/availability/availability.types.js").TimeInterval} openingHours
 * @property {number} minimumDurationMinutes
 * @property {import("../bookings/availability/availability.types.js").TimeInterval[]} busy
 * @property {import("../bookings/availability/availability.types.js").TimeInterval[]} available
 */

/**
 * @typedef {object} AdminWorkspaceDto
 * @property {string} id
 * @property {string} locationId
 * @property {string} name
 * @property {string} type
 * @property {string} floor
 * @property {string} pricePerHour
 * @property {string} availability
 * @property {boolean} simpleBooking
 * @property {string | null} imageUrl
 * @property {string} description
 * @property {string} cancellationPolicy
 * @property {string | null} calendarSyncProvider
 * @property {string | null} qrProvider
 * @property {string[]} amenityIds
 * @property {number} activeBookingCount
 * @property {{ id: string, name: string, slug: string }} location
 * @property {string} createdAt
 * @property {string} updatedAt
 */

export {};

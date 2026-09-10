/**
 * @typedef {object} LocationStatsDto
 * @property {number} desksTotal
 * @property {number} desksAvailable
 * @property {number} roomsTotal
 * @property {number} roomsAvailable
 * @property {number} occupancy
 * @property {string} priceFrom
 * @property {string[]} types
 * @property {"available"|"limited"|"unavailable"} availability
 */

/**
 * @typedef {object} LocationListItemDto
 * @property {string} id
 * @property {string} slug
 * @property {string} name
 * @property {string} address
 * @property {string} city
 * @property {string | null} imageUrl
 * @property {string} openingHours
 * @property {boolean} access247
 * @property {string} description
 * @property {string | null} latitude
 * @property {string | null} longitude
 * @property {string} timezone
 * @property {Array<{ id: string, name: string, nameId: string | null, category: string, icon: string }>} amenities
 * @property {LocationStatsDto} stats
 */

/**
 * @typedef {object} AdminLocationDto
 * @property {string} id
 * @property {string} slug
 * @property {string} name
 * @property {string} address
 * @property {string} city
 * @property {string | null} imageUrl
 * @property {string} openingHours
 * @property {boolean} access247
 * @property {string} description
 * @property {string | null} latitude
 * @property {string | null} longitude
 * @property {number} accessRadiusMeters
 * @property {string} timezone
 * @property {"active"|"inactive"} status
 * @property {number} workspaceCount
 * @property {string[]} amenityIds
 * @property {string} createdAt
 * @property {string} updatedAt
 */

export {};

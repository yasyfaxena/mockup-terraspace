/**
 * @typedef {object} AuthMethodDto
 * @property {string} providerId
 * @property {string} linkedAt
 */

/**
 * @typedef {object} MeDto
 * @property {string} id
 * @property {string} email
 * @property {string} name
 * @property {string | null} phone
 * @property {string | null} company
 * @property {string | null} image
 * @property {boolean} emailVerified
 * @property {import("../../shared/types/pagination.js").UserRole} role
 * @property {string} createdAt
 * @property {{ totalBookings: number, upcomingBookings: number, totalSpent: string, currency: string }} stats
 * @property {AuthMethodDto[]} authMethods
 */

/**
 * @typedef {object} AdminUserListItemDto
 * @property {string} id
 * @property {string} email
 * @property {string} name
 * @property {string | null} phone
 * @property {string | null} company
 * @property {string} role
 * @property {boolean} emailVerified
 * @property {boolean} banned
 * @property {string | null} image
 * @property {number} totalBookings
 * @property {string} totalSpent
 * @property {string | null} lastBookingDate
 * @property {string} createdAt
 */

/**
 * @typedef {AdminUserListItemDto & {
 *   banReason: string | null,
 *   banExpires: string | null,
 *   updatedAt: string,
 *   authMethods: AuthMethodDto[],
 *   activeSessions: number,
 *   recentBookings: Array<{ id: string, reference: string, bookingDate: string, status: string, totalAmount: string, workspaceName: string }>,
 * }} AdminUserDetailDto
 */

/**
 * @typedef {object} BanResultDto
 * @property {string} id
 * @property {boolean} banned
 * @property {string | null} banReason
 * @property {string | null} banExpires
 */

export {};

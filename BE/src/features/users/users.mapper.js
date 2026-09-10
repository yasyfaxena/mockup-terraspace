const MONEY_DECIMAL_PLACES = 2;
const ISO_DATE_LENGTH = 10;

/**
 * @param {unknown} value
 * @returns {string}
 */
function toMoneyString(value) {
  if (value === null || value === undefined) return "0.00";
  return Number(value).toFixed(MONEY_DECIMAL_PLACES);
}

/**
 * @param {{ providerId: string, createdAt: Date }} account
 * @returns {{ providerId: string, linkedAt: string }}
 */
function toAuthMethodDto(account) {
  return { providerId: account.providerId, linkedAt: account.createdAt.toISOString() };
}

/**
 * @param {import("@prisma/client").User} user
 * @param {{ stats: { totalBookings: number, upcomingBookings: number, totalSpent: unknown }, authMethods: Array<{ providerId: string, createdAt: Date }>, currency: string }} extra
 * @returns {import("./users.types.js").MeDto}
 */
export function toMeDto(user, { stats, authMethods, currency }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    company: user.company,
    image: user.image,
    emailVerified: user.emailVerified,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    stats: {
      totalBookings: stats.totalBookings,
      upcomingBookings: stats.upcomingBookings,
      totalSpent: toMoneyString(stats.totalSpent),
      currency,
    },
    authMethods: authMethods.map(toAuthMethodDto),
  };
}

/**
 * @param {any} row a row returned by UsersRepository#listAdmin — raw SQL, genuinely untyped
 * @returns {import("./users.types.js").AdminUserListItemDto}
 */
export function toAdminListItemDto(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    company: row.company,
    role: row.role,
    emailVerified: row.emailVerified,
    banned: row.banned,
    image: row.image,
    totalBookings: row.totalBookings,
    totalSpent: toMoneyString(row.totalSpent),
    lastBookingDate: row.lastBookingDate
      ? new Date(/** @type {string} */ (row.lastBookingDate))
          .toISOString()
          .slice(0, ISO_DATE_LENGTH)
      : null,
    createdAt: new Date(/** @type {string} */ (row.createdAt)).toISOString(),
  };
}

/**
 * @param {import("@prisma/client").User} user
 * @param {{
 *   authMethods: Array<{ providerId: string, createdAt: Date }>,
 *   activeSessions: number,
 *   recentBookings: Array<import("@prisma/client").Booking & { workspace: { name: string } }>,
 *   stats: { totalBookings: number, totalSpent: unknown },
 * }} extra
 * @returns {import("./users.types.js").AdminUserDetailDto}
 */
export function toAdminDetailDto(user, { authMethods, activeSessions, recentBookings, stats }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    company: user.company,
    role: user.role,
    emailVerified: user.emailVerified,
    banned: user.banned,
    image: user.image,
    totalBookings: stats.totalBookings,
    totalSpent: toMoneyString(stats.totalSpent),
    lastBookingDate: recentBookings[0]
      ? recentBookings[0].bookingDate.toISOString().slice(0, ISO_DATE_LENGTH)
      : null,
    createdAt: user.createdAt.toISOString(),
    banReason: user.banReason,
    banExpires: user.banExpires ? user.banExpires.toISOString() : null,
    updatedAt: user.updatedAt.toISOString(),
    authMethods: authMethods.map(toAuthMethodDto),
    activeSessions,
    recentBookings: recentBookings.map((booking) => ({
      id: booking.id,
      reference: booking.reference,
      bookingDate: booking.bookingDate.toISOString().slice(0, ISO_DATE_LENGTH),
      status: booking.status,
      totalAmount: toMoneyString(booking.totalAmount),
      workspaceName: booking.workspace.name,
    })),
  };
}

/**
 * @param {import("@prisma/client").User} user
 * @returns {import("./users.types.js").BanResultDto}
 */
export function toBanDto(user) {
  return {
    id: user.id,
    banned: user.banned,
    banReason: user.banReason,
    banExpires: user.banExpires ? user.banExpires.toISOString() : null,
  };
}

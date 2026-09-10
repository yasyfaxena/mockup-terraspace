/**
 * @typedef {"customer" | "staff" | "admin"} UserRole
 */

/**
 * @typedef {object} PaginationMeta
 * @property {number} page
 * @property {number} limit
 * @property {number} total
 * @property {number} totalPages
 */

/**
 * @template T
 * @typedef {object} PaginatedResult
 * @property {T[]} data
 * @property {PaginationMeta} meta
 */

/** @param {{ page: number, limit: number, total: number }} params */
export function toPaginationMeta({ page, limit, total }) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

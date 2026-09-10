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

export {};

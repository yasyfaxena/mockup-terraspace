import { z } from "zod";

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

/** Reusable page/limit query schema — every unbounded list endpoint takes this. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

/**
 * @param {{ page: number, limit: number, total: number }} params
 * @returns {import("../types/pagination.js").PaginationMeta}
 */
export function toPaginationMeta({ page, limit, total }) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

/**
 * Accepts a query param sent once (`string`) or repeated (`string[]`) and
 * always returns an array — Express's query parser gives either shape
 * depending on whether the client repeated the key.
 * @param {import("zod").ZodType<string>} [itemSchema]
 */
export function repeatableQueryParam(itemSchema = z.string()) {
  return z
    .union([itemSchema, z.array(itemSchema)])
    .transform((value) => (Array.isArray(value) ? value : [value]))
    .optional();
}

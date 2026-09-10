import { z } from "zod";
import { paginationQuerySchema, repeatableQueryParam } from "../../shared/lib/pagination.js";

const WORKSPACE_TYPES = [
  "hot_desk",
  "dedicated_desk",
  "private_office",
  "meeting_room",
  "event_space",
];
const WORKSPACE_AVAILABILITIES = ["available", "limited", "full", "maintenance", "disabled"];

export const listWorkspacesQuerySchema = paginationQuerySchema.extend({
  locationId: z.string().uuid().optional(),
  locationSlug: z.string().optional(),
  type: repeatableQueryParam(z.enum(WORKSPACE_TYPES)),
  availability: repeatableQueryParam(z.enum(WORKSPACE_AVAILABILITIES)),
  amenityId: repeatableQueryParam(z.string().uuid()),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(["pricePerHour", "name", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
});

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
const NAME_MAX_LENGTH = 150;
const FLOOR_MAX_LENGTH = 50;
const PROVIDER_MAX_LENGTH = 50;

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

export const listAdminWorkspacesQuerySchema = paginationQuerySchema.extend({
  locationId: z.string().uuid().optional(),
  type: repeatableQueryParam(z.enum(WORKSPACE_TYPES)),
  availability: repeatableQueryParam(z.enum(WORKSPACE_AVAILABILITIES)),
  amenityId: repeatableQueryParam(z.string().uuid()),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  q: z.string().optional(),
  sort: z.enum(["pricePerHour", "name", "createdAt"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export const createWorkspaceSchema = z.object({
  locationId: z.string().uuid(),
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
  type: z.enum(WORKSPACE_TYPES),
  floor: z.string().max(FLOOR_MAX_LENGTH).default(""),
  pricePerHour: z.coerce.number().min(0).default(0),
  availability: z.enum(WORKSPACE_AVAILABILITIES).default("available"),
  simpleBooking: z.boolean().default(false),
  imageUrl: z.string().url().nullable().default(null),
  description: z.string().default(""),
  cancellationPolicy: z.string().default(""),
  calendarSyncProvider: z.string().max(PROVIDER_MAX_LENGTH).nullable().default(null),
  qrProvider: z.string().max(PROVIDER_MAX_LENGTH).nullable().default(null),
  amenityIds: z.array(z.string().uuid()).default([]),
});

export const updateWorkspaceSchema = z.object({
  locationId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH).optional(),
  type: z.enum(WORKSPACE_TYPES).optional(),
  floor: z.string().max(FLOOR_MAX_LENGTH).optional(),
  pricePerHour: z.coerce.number().min(0).optional(),
  availability: z.enum(WORKSPACE_AVAILABILITIES).optional(),
  simpleBooking: z.boolean().optional(),
  imageUrl: z.string().url().nullable().optional(),
  description: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  calendarSyncProvider: z.string().max(PROVIDER_MAX_LENGTH).nullable().optional(),
  qrProvider: z.string().max(PROVIDER_MAX_LENGTH).nullable().optional(),
  amenityIds: z.array(z.string().uuid()).optional(),
});

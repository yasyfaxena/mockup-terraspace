import { z } from "zod";
import { repeatableQueryParam } from "../../shared/lib/pagination.js";

const LOCATION_STATUSES = ["active", "inactive"];

// `Intl.supportedValuesOf` only ever returns real IANA zone names — a
// fixed offset like "+07:00" is never a member, so checking membership
// rejects both invalid strings and offsets in one step (locations.md §4).
const TIMEZONE_VALUES = new Set(Intl.supportedValuesOf("timeZone"));
const timezoneSchema = z
  .string()
  .refine((value) => TIMEZONE_VALUES.has(value), "Must be a valid IANA timezone.");

export const listLocationsQuerySchema = z.object({
  city: z.string().optional(),
  q: z.string().optional(),
  amenityId: repeatableQueryParam(z.string().uuid()),
});

export const listAdminLocationsQuerySchema = z.object({
  status: z.enum(LOCATION_STATUSES).optional(),
  q: z.string().optional(),
});

export const createLocationSchema = z.object({
  slug: z.string().trim().min(1),
  name: z.string().trim().min(1).max(150),
  address: z.string().trim().min(1),
  city: z.string().trim().min(1).max(100),
  imageUrl: z.string().url().nullable().default(null),
  openingHours: z.string().default("Mon–Sun 09:00–22:00"),
  access247: z.boolean().default(false),
  description: z.string().default(""),
  latitude: z.number().min(-90).max(90).nullable().default(null),
  longitude: z.number().min(-180).max(180).nullable().default(null),
  accessRadiusMeters: z.number().int().positive().default(50),
  timezone: timezoneSchema.default("Asia/Jakarta"),
  status: z.enum(LOCATION_STATUSES).default("active"),
  amenityIds: z.array(z.string().uuid()).default([]),
});

export const updateLocationSchema = z.object({
  slug: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(150).optional(),
  address: z.string().trim().min(1).optional(),
  city: z.string().trim().min(1).max(100).optional(),
  imageUrl: z.string().url().nullable().optional(),
  openingHours: z.string().optional(),
  access247: z.boolean().optional(),
  description: z.string().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  accessRadiusMeters: z.number().int().positive().optional(),
  timezone: timezoneSchema.optional(),
  status: z.enum(LOCATION_STATUSES).optional(),
  amenityIds: z.array(z.string().uuid()).optional(),
});

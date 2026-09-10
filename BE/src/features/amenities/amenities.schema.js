import { z } from "zod";

const AMENITY_STATUSES = ["active", "inactive"];
const NAME_MAX_LENGTH = 100;
const CATEGORY_MAX_LENGTH = 50;
const ICON_MAX_LENGTH = 50;

export const listAmenitiesQuerySchema = z.object({
  category: z.string().optional(),
});

export const listAdminAmenitiesQuerySchema = z.object({
  status: z.enum(AMENITY_STATUSES).optional(),
  category: z.string().optional(),
  q: z.string().optional(),
});

export const createAmenitySchema = z.object({
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
  category: z.string().max(CATEGORY_MAX_LENGTH).default("General"),
  icon: z.string().max(ICON_MAX_LENGTH).default("tag"),
  status: z.enum(AMENITY_STATUSES).default("active"),
});

export const updateAmenitySchema = z.object({
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH).optional(),
  category: z.string().max(CATEGORY_MAX_LENGTH).optional(),
  icon: z.string().max(ICON_MAX_LENGTH).optional(),
  status: z.enum(AMENITY_STATUSES).optional(),
});

import { z } from "zod";

const AMENITY_STATUSES = ["active", "inactive"];

export const listAmenitiesQuerySchema = z.object({
  category: z.string().optional(),
});

export const listAdminAmenitiesQuerySchema = z.object({
  status: z.enum(AMENITY_STATUSES).optional(),
  category: z.string().optional(),
  q: z.string().optional(),
});

export const createAmenitySchema = z.object({
  name: z.string().trim().min(1).max(100),
  category: z.string().max(50).default("General"),
  icon: z.string().max(50).default("tag"),
  status: z.enum(AMENITY_STATUSES).default("active"),
});

export const updateAmenitySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  category: z.string().max(50).optional(),
  icon: z.string().max(50).optional(),
  status: z.enum(AMENITY_STATUSES).optional(),
});

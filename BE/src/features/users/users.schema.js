import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";

const USER_ROLES = ["customer", "staff", "admin"];

/**
 * `users.md` specifies region `MY` for every phone field on this feature —
 * kept exactly as documented even though the platform is otherwise
 * IDR/Indonesia-focused; worth confirming with product before Phase 8.
 */
const phoneSchema = z
  .string()
  .max(30)
  .refine((value) => isValidPhoneNumber(value, "MY"), "Must be a valid phone number.");

export const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  phone: phoneSchema.nullable().optional(),
  company: z.string().max(150).nullable().optional(),
  image: z.string().url().nullable().optional(),
});

export const listUsersQuerySchema = z.object({
  q: z.string().optional(),
  role: z.enum(USER_ROLES).optional(),
  banned: z.coerce.boolean().optional(),
  sort: z.enum(["name", "createdAt", "totalSpent", "totalBookings"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createUserSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
  name: z.string().trim().min(1).max(150),
  phone: phoneSchema.nullable().default(null),
  company: z.string().max(150).nullable().default(null),
  role: z.enum(USER_ROLES).default("customer"),
  sendWelcomeEmail: z.boolean().default(true),
});

export const adminUpdateUserSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  phone: phoneSchema.nullable().optional(),
  company: z.string().max(150).nullable().optional(),
  role: z.enum(USER_ROLES).optional(),
  email: z.string().email().toLowerCase().optional(),
});

export const banUserSchema = z.object({
  reason: z.string().trim().min(1),
  expiresAt: z.string().datetime().optional(),
});

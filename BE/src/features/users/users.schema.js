import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE } from "../../shared/lib/pagination.js";

const USER_ROLES = ["customer", "staff", "admin"];
const PHONE_MAX_LENGTH = 30;
const NAME_MAX_LENGTH = 150;
const COMPANY_MAX_LENGTH = 150;
const MIN_PASSWORD_LENGTH = 8;
const FIRST_PAGE = 1;

/**
 * `users.md` specifies region `MY` for every phone field on this feature —
 * kept exactly as documented even though the platform is otherwise
 * IDR/Indonesia-focused; worth confirming with product before Phase 8.
 */
const phoneSchema = z
  .string()
  .max(PHONE_MAX_LENGTH)
  .refine((value) => isValidPhoneNumber(value, "MY"), "Must be a valid phone number.");

export const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH).optional(),
  phone: phoneSchema.nullable().optional(),
  company: z.string().max(COMPANY_MAX_LENGTH).nullable().optional(),
  image: z.string().url().nullable().optional(),
});

export const listUsersQuerySchema = z.object({
  q: z.string().optional(),
  role: z.enum(USER_ROLES).optional(),
  banned: z.coerce.boolean().optional(),
  sort: z.enum(["name", "createdAt", "totalSpent", "totalBookings"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(FIRST_PAGE).default(FIRST_PAGE),
  limit: z.coerce.number().int().min(FIRST_PAGE).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const createUserSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(MIN_PASSWORD_LENGTH),
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
  phone: phoneSchema.nullable().default(null),
  company: z.string().max(COMPANY_MAX_LENGTH).nullable().default(null),
  role: z.enum(USER_ROLES).default("customer"),
  sendWelcomeEmail: z.boolean().default(true),
});

export const adminUpdateUserSchema = z.object({
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH).optional(),
  phone: phoneSchema.nullable().optional(),
  company: z.string().max(COMPANY_MAX_LENGTH).nullable().optional(),
  role: z.enum(USER_ROLES).optional(),
  email: z.string().email().toLowerCase().optional(),
});

export const banUserSchema = z.object({
  reason: z.string().trim().min(1),
  expiresAt: z.string().datetime().optional(),
});

import { z } from "zod";

/**
 * Mirrors BE `users.schema.js`'s `updateMeSchema` — `role`/`banned` are
 * admin-only inputs and never appear here (features/users.md §4: the
 * customer profile form and the admin edit form stay on two schemas, not
 * one schema with conditionally-hidden fields). Full phone-number format
 * validation (BE uses `libphonenumber-js` against region `MY`) is left to
 * the server; this is a light client-side sanity check only.
 */
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(150),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^\+?[0-9\s-]+$/, "Digits only, optionally starting with +")
    .nullable(),
  company: z.string().trim().max(150).nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

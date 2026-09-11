import { z } from "zod";
import { CURRENCY_EXPONENT } from "./settings.types";

/**
 * Mirrors BE `settings.schema.js`'s `updateSettingsSchema` — BE treats
 * every field as optional (a `PUT`-but-partial singleton), but the form
 * always submits the full object it just read from `GET /admin/settings`,
 * so every field stays required here (the `zodResolver` + `useForm<T>`
 * default/optional mismatch documented in `bookings.schema.ts`).
 */
export const updateSettingsSchema = z.object({
  companyName: z.string().trim().min(1).max(150),
  supportEmail: z.string().trim().email().nullable(),
  currency: z
    .string()
    .length(3)
    .toUpperCase()
    .refine((value) => value in CURRENCY_EXPONENT, {
      message: "Currency has no known minor-unit exponent — the payment layer cannot charge it.",
    }),
  taxPercent: z
    .number()
    .min(0)
    .max(100)
    .refine((value) => Number.isInteger(value * 100), {
      message: "must have at most 2 decimal places",
    }),
  cancellationWindowHours: z.number().int().min(0),
  advanceBookingDays: z.number().int().min(0),
  emailNotificationsEnabled: z.boolean(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

import { z } from "zod";
import { CURRENCY_EXPONENT } from "../../shared/lib/money.js";

const COMPANY_NAME_MAX_LENGTH = 150;
const TAX_PERCENT_MIN = 0;
const TAX_PERCENT_MAX = 100;
const TAX_PERCENT_DECIMAL_SCALE = 100;
const CURRENCY_CODE_LENGTH = 3;

const currencySchema = z
  .string()
  .length(CURRENCY_CODE_LENGTH)
  .toUpperCase()
  .refine((value) => value in CURRENCY_EXPONENT, {
    message: "Currency has no known minor-unit exponent — the payment layer cannot charge it.",
  });

/**
 * `PUT`, not `PATCH` — a singleton is replaced, not partially addressed.
 * Every field is optional; an omitted field keeps its current value
 * (settings.md §3), applied in the service via a Prisma partial update.
 */
const HERO_HEADLINE_MAX_LENGTH = 150;

// No `.max()` here — unlike `heroHeadline`, this field can hold either a
// short pasted URL or a `data:` URI from an admin file upload (mirrors
// workspaces/locations `imageUrl`, which are unbounded for the same
// reason). The column was widened to TEXT to match.
export const updateSettingsSchema = z.object({
  companyName: z.string().trim().min(1).max(COMPANY_NAME_MAX_LENGTH).optional(),
  supportEmail: z.string().email().nullable().optional(),
  heroHeadline: z.string().trim().min(1).max(HERO_HEADLINE_MAX_LENGTH).optional(),
  heroBackgroundUrl: z.string().trim().url().nullable().optional(),
  currency: currencySchema.optional(),
  taxPercent: z.coerce
    .number()
    .min(TAX_PERCENT_MIN)
    .max(TAX_PERCENT_MAX)
    .refine((value) => Number.isInteger(value * TAX_PERCENT_DECIMAL_SCALE), {
      message: "must have at most 2 decimal places",
    })
    .optional(),
  cancellationWindowHours: z.coerce.number().int().min(0).optional(),
  advanceBookingDays: z.coerce.number().int().min(0).optional(),
  emailNotificationsEnabled: z.boolean().optional(),
});

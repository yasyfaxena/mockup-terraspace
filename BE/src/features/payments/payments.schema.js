import { z } from "zod";
import { paginationQuerySchema } from "../../shared/lib/pagination.js";
import { env } from "../../shared/config/env.js";

const PROVIDERS = ["xendit", "midtrans"];
const PAYMENT_STATES = [
  "pending",
  "awaiting_payment",
  "paid",
  "failed",
  "expired",
  "refunded",
  "partially_refunded",
];
const REASON_MAX_LENGTH = 500;

export const paymentMethodsQuerySchema = z.object({
  provider: z.enum(PROVIDERS).default("xendit"),
});

export const createChargeSchema = z.object({
  provider: z
    .enum(PROVIDERS)
    .default(() => /** @type {"xendit" | "midtrans"} */ (env.PAYBRIDGE_PROVIDER)),
});

export const refundSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  reason: z.string().trim().max(REASON_MAX_LENGTH).optional(),
});

export const listAdminPaymentsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(PAYMENT_STATES).optional(),
  provider: z.enum(PROVIDERS).optional(),
  method: z.string().optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")
    .optional(),
  q: z.string().optional(),
});

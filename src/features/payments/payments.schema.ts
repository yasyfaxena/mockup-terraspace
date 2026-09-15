import { z } from "zod";

// Mirrors BE payments.schema.js's refundSchema — `amount` omitted means
// "refund the full remaining balance" (payments.service.js's refund()).
export const refundFormSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().trim().max(500).optional(),
});
export type RefundFormInput = z.infer<typeof refundFormSchema>;

import { z } from "zod";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// Mirrors BE bookings.schema.js's createBookingSchema — no amount/price
// field. `endTime` is validated against `startTime` at submit time, not
// here (React Hook Form's field-level rules don't see sibling values
// easily; the review page does this check before calling the mutation).
export const createBookingSchema = z.object({
  workspaceId: z.string().uuid(),
  bookingDate: z.string().regex(DATE_REGEX, "must be YYYY-MM-DD"),
  startTime: z.string().regex(TIME_REGEX, "must be HH:mm"),
  endTime: z.string().regex(TIME_REGEX, "must be HH:mm"),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// Mirrors BE bookings.schema.js's createAdminBookingSchema.
export const createAdminBookingSchema = z.object({
  userId: z.string().min(1, "Customer user id is required"),
  workspaceId: z.string().uuid(),
  bookingDate: z.string().regex(DATE_REGEX, "must be YYYY-MM-DD"),
  startTime: z.string().regex(TIME_REGEX, "must be HH:mm"),
  endTime: z.string().regex(TIME_REGEX, "must be HH:mm"),
  status: z.enum(["pending", "confirmed"]),
});
export type CreateAdminBookingInput = z.infer<typeof createAdminBookingSchema>;

// Mirrors BE bookings.schema.js's updateAdminBookingSchema — its `status`
// covers all four states (create's is deliberately narrower: walk-ins only
// start `pending`/`confirmed`).
export const updateAdminBookingSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]).optional(),
  workspaceId: z.string().uuid().optional(),
  bookingDate: z.string().regex(DATE_REGEX, "must be YYYY-MM-DD").optional(),
  startTime: z.string().regex(TIME_REGEX, "must be HH:mm").optional(),
  endTime: z.string().regex(TIME_REGEX, "must be HH:mm").optional(),
});
export type UpdateAdminBookingInput = z.infer<typeof updateAdminBookingSchema>;

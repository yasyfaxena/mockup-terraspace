import { z } from "zod";
import { differenceInCalendarDays } from "date-fns";
import { paginationQuerySchema } from "../../shared/lib/pagination.js";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const BOOKING_STATUSES = ["pending", "confirmed", "cancelled", "completed"];
const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];
const MAX_CALENDAR_RANGE_DAYS = 92;

const bookingDateField = z.string().regex(DATE_REGEX, "must be YYYY-MM-DD");
const timeField = z.string().regex(TIME_REGEX, "must be HH:mm");

/**
 * `endTime` strictly after `startTime` — the exact minute count is
 * checked in the service (BOOKING_MIN_DURATION).
 * @param {{ startTime?: string, endTime?: string }} data
 * @param {import("zod").RefinementCtx} ctx
 */
function requireTimeOrder(data, ctx) {
  if (
    data.startTime !== undefined &&
    data.endTime !== undefined &&
    data.endTime <= data.startTime
  ) {
    ctx.addIssue({ code: "custom", message: "endTime must be after startTime", path: ["endTime"] });
  }
}

export const createBookingSchema = z
  .object({
    workspaceId: z.string().uuid(),
    bookingDate: bookingDateField,
    startTime: timeField,
    endTime: timeField,
  })
  .superRefine(requireTimeOrder);

export const createAdminBookingSchema = z
  .object({
    userId: z.string().min(1),
    workspaceId: z.string().uuid(),
    bookingDate: bookingDateField,
    startTime: timeField,
    endTime: timeField,
    status: z.enum(["pending", "confirmed"]).default("confirmed"),
  })
  .superRefine(requireTimeOrder);

export const updateAdminBookingSchema = z
  .object({
    status: z.enum(BOOKING_STATUSES).optional(),
    workspaceId: z.string().uuid().optional(),
    bookingDate: bookingDateField.optional(),
    startTime: timeField.optional(),
    endTime: timeField.optional(),
  })
  .superRefine(requireTimeOrder);

export const listBookingsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(BOOKING_STATUSES).optional(),
  scope: z.enum(["upcoming", "past", "all"]).default("all"),
});

export const listAdminBookingsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(BOOKING_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  locationId: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional(),
  userId: z.string().optional(),
  from: bookingDateField.optional(),
  to: bookingDateField.optional(),
  q: z.string().optional(),
  sort: z.enum(["bookingDate", "createdAt", "totalAmount"]).default("bookingDate"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const calendarQuerySchema = z
  .object({
    from: bookingDateField,
    to: bookingDateField,
    locationId: z.string().uuid().optional(),
    workspaceId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    const span = differenceInCalendarDays(
      new Date(`${data.to}T00:00:00.000Z`),
      new Date(`${data.from}T00:00:00.000Z`),
    );
    if (span < 0) {
      ctx.addIssue({ code: "custom", message: "to must not be before from", path: ["to"] });
    } else if (span > MAX_CALENDAR_RANGE_DAYS) {
      ctx.addIssue({
        code: "custom",
        message: `Range cannot exceed ${MAX_CALENDAR_RANGE_DAYS} days`,
        path: ["to"],
      });
    }
  });

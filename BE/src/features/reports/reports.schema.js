import { z } from "zod";
import { differenceInCalendarDays } from "date-fns";
import { paginationQuerySchema, repeatableQueryParam } from "../../shared/lib/pagination.js";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_REPORT_RANGE_DAYS = 366;
const PAYMENT_STATES = [
  "pending",
  "awaiting_payment",
  "paid",
  "failed",
  "expired",
  "refunded",
  "partially_refunded",
];
const PROVIDERS = ["xendit", "midtrans"];
const WORKSPACE_TYPES = ["hot_desk", "dedicated_desk", "meeting_room", "private_office"];
const ACTIVITY_TYPES = [
  "booking_created",
  "booking_cancelled",
  "payment_succeeded",
  "payment_failed",
  "payment_refunded",
  "user_registered",
];
const ACTIVITY_LIMIT_MAX = 50;
const ACTIVITY_LIMIT_DEFAULT = 20;
const EXPORT_REPORTS = ["bookings", "payments", "revenue"];

const dateField = z.string().regex(DATE_REGEX, "must be YYYY-MM-DD");

/**
 * `to` required and after `from`, capped at `MAX_REPORT_RANGE_DAYS` — every
 * ranged report enforces this (development-phases.md §7).
 * @param {{ from?: string, to?: string }} data
 * @param {import("zod").RefinementCtx} ctx
 */
function requireBoundedRange(data, ctx) {
  if (data.from === undefined || data.to === undefined) return;
  const span = differenceInCalendarDays(
    new Date(`${data.to}T00:00:00.000Z`),
    new Date(`${data.from}T00:00:00.000Z`),
  );
  if (span < 0) {
    ctx.addIssue({ code: "custom", message: "to must not be before from", path: ["to"] });
  } else if (span > MAX_REPORT_RANGE_DAYS) {
    ctx.addIssue({
      code: "custom",
      message: `Range cannot exceed ${MAX_REPORT_RANGE_DAYS} days`,
      path: ["to"],
    });
  }
}

export const overviewQuerySchema = z.object({
  date: dateField.optional(),
  locationId: z.string().uuid().optional(),
});

export const revenueQuerySchema = z
  .object({
    from: dateField,
    to: dateField,
    groupBy: z.enum(["day", "week", "month"]).default("day"),
    locationId: z.string().uuid().optional(),
    workspaceType: z.enum(WORKSPACE_TYPES).optional(),
  })
  .superRefine(requireBoundedRange);

export const occupancyQuerySchema = z
  .object({
    from: dateField,
    to: dateField,
    locationId: z.string().uuid().optional(),
    groupBy: z.enum(["day", "week", "month"]).default("day"),
  })
  .superRefine(requireBoundedRange);

export const paymentsReportQuerySchema = paginationQuerySchema.extend({
  from: dateField.optional(),
  to: dateField.optional(),
  status: z.enum(PAYMENT_STATES).optional(),
  provider: z.enum(PROVIDERS).optional(),
  method: z.string().optional(),
  q: z.string().optional(),
});

export const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(ACTIVITY_LIMIT_MAX).default(ACTIVITY_LIMIT_DEFAULT),
  since: z.string().datetime().optional(),
  type: repeatableQueryParam(z.enum(ACTIVITY_TYPES)),
});

export const exportQuerySchema = z
  .object({
    report: z.enum(EXPORT_REPORTS),
    from: dateField,
    to: dateField,
    locationId: z.string().uuid().optional(),
  })
  .superRefine(requireBoundedRange);

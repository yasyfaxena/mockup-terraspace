import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { requireAuth, requireRole } from "../auth/index.js";
import {
  paymentMethodsQuerySchema,
  createChargeSchema,
  refundSchema,
  listAdminPaymentsQuerySchema,
} from "./payments.schema.js";
import {
  listPaymentMethods,
  createCharge,
  getPaymentStatus,
  listAdmin,
  getAdminDetail,
  refund,
} from "./payments.controller.js";

/** Mounted at `/payment-methods` — see shared/router.js. */
export const paymentMethodsRouter = Router();
paymentMethodsRouter.get("/", validate({ query: paymentMethodsQuerySchema }), listPaymentMethods);

/**
 * Mounted at `/bookings` alongside `bookingsRouter` (payments.md §2, §8) —
 * both routers own different sub-paths under the same prefix.
 */
export const bookingPaymentsRouter = Router();
bookingPaymentsRouter.post(
  "/:id/payments",
  requireAuth,
  validate({ body: createChargeSchema }),
  createCharge,
);
bookingPaymentsRouter.get("/:reference/payment", requireAuth, getPaymentStatus);

/** Mounted at `/admin/payments` — see shared/router.js. Admin only — not staff, this is money (payments.md §9). */
export const adminPaymentsRouter = Router();
const requireAdmin = [requireAuth, requireRole("admin")];

adminPaymentsRouter.get(
  "/",
  ...requireAdmin,
  validate({ query: listAdminPaymentsQuerySchema }),
  listAdmin,
);
adminPaymentsRouter.get("/:id", ...requireAdmin, getAdminDetail);
adminPaymentsRouter.post("/:id/refund", ...requireAdmin, validate({ body: refundSchema }), refund);

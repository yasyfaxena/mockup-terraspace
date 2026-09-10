import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { requireAuth, requireRole } from "../auth/index.js";
import {
  createBookingSchema,
  listBookingsQuerySchema,
  createAdminBookingSchema,
  updateAdminBookingSchema,
  listAdminBookingsQuerySchema,
  calendarQuerySchema,
} from "./bookings.schema.js";
import {
  create,
  list,
  getByReference,
  cancel,
  listAdmin,
  getAdminDetail,
  createStaff,
  updateAdmin,
  remove,
  calendar,
} from "./bookings.controller.js";

/** Mounted at `/bookings` — see shared/router.js. Every route is customer-owned; `requireAuth` is the only gate, ownership is enforced in the service (bookings.md §4 rule 3). */
export const bookingsRouter = Router();
bookingsRouter.post("/", requireAuth, validate({ body: createBookingSchema }), create);
bookingsRouter.get("/", requireAuth, validate({ query: listBookingsQuerySchema }), list);
bookingsRouter.get("/:reference", requireAuth, getByReference);
bookingsRouter.patch("/:id/cancel", requireAuth, cancel);

/** Mounted at `/admin/bookings` — see shared/router.js. */
export const adminBookingsRouter = Router();
const requireStaff = [requireAuth, requireRole("staff", "admin")];
const requireAdmin = [requireAuth, requireRole("admin")];

// Must precede `/:id` — otherwise "calendar" matches as an id.
adminBookingsRouter.get(
  "/calendar",
  ...requireStaff,
  validate({ query: calendarQuerySchema }),
  calendar,
);
adminBookingsRouter.get(
  "/",
  ...requireStaff,
  validate({ query: listAdminBookingsQuerySchema }),
  listAdmin,
);
adminBookingsRouter.post(
  "/",
  ...requireStaff,
  validate({ body: createAdminBookingSchema }),
  createStaff,
);
adminBookingsRouter.get("/:id", ...requireStaff, getAdminDetail);
adminBookingsRouter.patch(
  "/:id",
  ...requireStaff,
  validate({ body: updateAdminBookingSchema }),
  updateAdmin,
);
adminBookingsRouter.delete("/:id", ...requireAdmin, remove);

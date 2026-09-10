import { Router } from "express";
import { usersRouter, adminUsersRouter } from "../features/users/index.js";
import { locationsRouter, adminLocationsRouter } from "../features/locations/index.js";
import { workspacesRouter, adminWorkspacesRouter } from "../features/workspaces/index.js";
import { amenitiesRouter, adminAmenitiesRouter } from "../features/amenities/index.js";
import { bookingsRouter, adminBookingsRouter } from "../features/bookings/index.js";
import {
  paymentMethodsRouter,
  bookingPaymentsRouter,
  adminPaymentsRouter,
} from "../features/payments/index.js";

export const apiRouter = Router();

apiRouter.use("/locations", locationsRouter);
apiRouter.use("/workspaces", workspacesRouter);
apiRouter.use("/amenities", amenitiesRouter);
apiRouter.use("/bookings", bookingsRouter);
apiRouter.use("/bookings", bookingPaymentsRouter); // owns /:id/payments and /:reference/payment
apiRouter.use("/payment-methods", paymentMethodsRouter);
apiRouter.use("/me", usersRouter);
apiRouter.use("/admin/users", adminUsersRouter);
apiRouter.use("/admin/locations", adminLocationsRouter);
apiRouter.use("/admin/workspaces", adminWorkspacesRouter);
apiRouter.use("/admin/amenities", adminAmenitiesRouter);
apiRouter.use("/admin/bookings", adminBookingsRouter);
apiRouter.use("/admin/payments", adminPaymentsRouter);

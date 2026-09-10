import { Router } from "express";
import { usersRouter, adminUsersRouter } from "../features/users/index.js";
import { locationsRouter, adminLocationsRouter } from "../features/locations/index.js";
import { workspacesRouter, adminWorkspacesRouter } from "../features/workspaces/index.js";
import { amenitiesRouter, adminAmenitiesRouter } from "../features/amenities/index.js";

export const apiRouter = Router();

apiRouter.use("/locations", locationsRouter);
apiRouter.use("/workspaces", workspacesRouter);
apiRouter.use("/amenities", amenitiesRouter);
apiRouter.use("/me", usersRouter);
apiRouter.use("/admin/users", adminUsersRouter);
apiRouter.use("/admin/locations", adminLocationsRouter);
apiRouter.use("/admin/workspaces", adminWorkspacesRouter);
apiRouter.use("/admin/amenities", adminAmenitiesRouter);

// Feature routers will be mounted here in later phases:
// apiRouter.use("/bookings", bookingsRouter);

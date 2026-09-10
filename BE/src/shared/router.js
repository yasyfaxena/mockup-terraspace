import { Router } from "express";
import { usersRouter, adminUsersRouter } from "../features/users/index.js";

export const apiRouter = Router();

apiRouter.use("/me", usersRouter);
apiRouter.use("/admin/users", adminUsersRouter);

// Feature routers will be mounted here in later phases:
// apiRouter.use("/locations",  locationsRouter);
// apiRouter.use("/workspaces", workspacesRouter);
// apiRouter.use("/amenities",  amenitiesRouter);
// apiRouter.use("/bookings",   bookingsRouter);

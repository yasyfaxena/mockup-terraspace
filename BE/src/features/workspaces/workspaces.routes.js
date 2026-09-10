import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { listWorkspacesQuerySchema, availabilityQuerySchema } from "./workspaces.schema.js";
import { listPublic, getById, getAvailability } from "./workspaces.controller.js";

/** Mounted at `/workspaces` — see shared/router.js. */
export const workspacesRouter = Router();
workspacesRouter.get("/", validate({ query: listWorkspacesQuerySchema }), listPublic);
workspacesRouter.get(
  "/:id/availability",
  validate({ query: availabilityQuerySchema }),
  getAvailability,
);
workspacesRouter.get("/:id", getById);

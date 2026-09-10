import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { requireAuth, requireRole } from "../auth/index.js";
import {
  listWorkspacesQuerySchema,
  availabilityQuerySchema,
  listAdminWorkspacesQuerySchema,
  createWorkspaceSchema,
  updateWorkspaceSchema,
} from "./workspaces.schema.js";
import {
  listPublic,
  getById,
  getAvailability,
  listAdmin,
  create,
  update,
  remove,
} from "./workspaces.controller.js";

/** Mounted at `/workspaces` — see shared/router.js. */
export const workspacesRouter = Router();
workspacesRouter.get("/", validate({ query: listWorkspacesQuerySchema }), listPublic);
workspacesRouter.get(
  "/:id/availability",
  validate({ query: availabilityQuerySchema }),
  getAvailability,
);
workspacesRouter.get("/:id", getById);

/** Mounted at `/admin/workspaces` — see shared/router.js. */
export const adminWorkspacesRouter = Router();
const requireAdmin = [requireAuth, requireRole("admin")];

adminWorkspacesRouter.get(
  "/",
  ...requireAdmin,
  validate({ query: listAdminWorkspacesQuerySchema }),
  listAdmin,
);
adminWorkspacesRouter.post("/", ...requireAdmin, validate({ body: createWorkspaceSchema }), create);
adminWorkspacesRouter.patch(
  "/:id",
  ...requireAdmin,
  validate({ body: updateWorkspaceSchema }),
  update,
);
adminWorkspacesRouter.delete("/:id", ...requireAdmin, remove);

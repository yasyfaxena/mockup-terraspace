import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { requireAuth, requireRole } from "../auth/index.js";
import {
  listLocationsQuerySchema,
  listAdminLocationsQuerySchema,
  createLocationSchema,
  updateLocationSchema,
} from "./locations.schema.js";
import {
  listPublic,
  getBySlug,
  listAdmin,
  create,
  update,
  remove,
} from "./locations.controller.js";

/** Mounted at `/locations` — see shared/router.js. */
export const locationsRouter = Router();
locationsRouter.get("/", validate({ query: listLocationsQuerySchema }), listPublic);
locationsRouter.get("/:slug", getBySlug);

/** Mounted at `/admin/locations` — see shared/router.js. */
export const adminLocationsRouter = Router();
const requireAdmin = [requireAuth, requireRole("admin")];

adminLocationsRouter.get(
  "/",
  ...requireAdmin,
  validate({ query: listAdminLocationsQuerySchema }),
  listAdmin,
);
adminLocationsRouter.post("/", ...requireAdmin, validate({ body: createLocationSchema }), create);
adminLocationsRouter.patch(
  "/:id",
  ...requireAdmin,
  validate({ body: updateLocationSchema }),
  update,
);
adminLocationsRouter.delete("/:id", ...requireAdmin, remove);

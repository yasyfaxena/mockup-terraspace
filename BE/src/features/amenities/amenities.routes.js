import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { requireAuth, requireRole } from "../auth/index.js";
import {
  listAmenitiesQuerySchema,
  listAdminAmenitiesQuerySchema,
  createAmenitySchema,
  updateAmenitySchema,
} from "./amenities.schema.js";
import { listPublic, listAdmin, create, update, remove } from "./amenities.controller.js";

/** Mounted at `/amenities` — see shared/router.js. */
export const amenitiesRouter = Router();
amenitiesRouter.get("/", validate({ query: listAmenitiesQuerySchema }), listPublic);

/** Mounted at `/admin/amenities` — see shared/router.js. */
export const adminAmenitiesRouter = Router();
const requireAdmin = [requireAuth, requireRole("admin")];

adminAmenitiesRouter.get(
  "/",
  ...requireAdmin,
  validate({ query: listAdminAmenitiesQuerySchema }),
  listAdmin,
);
adminAmenitiesRouter.post("/", ...requireAdmin, validate({ body: createAmenitySchema }), create);
adminAmenitiesRouter.patch(
  "/:id",
  ...requireAdmin,
  validate({ body: updateAmenitySchema }),
  update,
);
adminAmenitiesRouter.delete("/:id", ...requireAdmin, remove);

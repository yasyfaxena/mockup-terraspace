import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { listLocationsQuerySchema } from "./locations.schema.js";
import { listPublic, getBySlug } from "./locations.controller.js";

/** Mounted at `/locations` — see shared/router.js. */
export const locationsRouter = Router();
locationsRouter.get("/", validate({ query: listLocationsQuerySchema }), listPublic);
locationsRouter.get("/:slug", getBySlug);

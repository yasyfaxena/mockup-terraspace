import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { listAmenitiesQuerySchema } from "./amenities.schema.js";
import { listPublic } from "./amenities.controller.js";

/** Mounted at `/amenities` — see shared/router.js. */
export const amenitiesRouter = Router();
amenitiesRouter.get("/", validate({ query: listAmenitiesQuerySchema }), listPublic);

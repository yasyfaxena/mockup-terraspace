import { locationsService } from "./locations.service.js";
import { stringParam } from "../../shared/lib/params.js";

/** @type {import("express").RequestHandler} */
export const listPublic = async (req, res, next) => {
  try {
    return res.json(await locationsService.listPublic(/** @type {any} */ (req).validatedQuery));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const getBySlug = async (req, res, next) => {
  try {
    return res.json(await locationsService.getBySlug(stringParam(req, "slug")));
  } catch (err) {
    return next(err);
  }
};

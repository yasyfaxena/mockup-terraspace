import { amenitiesService } from "./amenities.service.js";

/** @type {import("express").RequestHandler} */
export const listPublic = async (req, res, next) => {
  try {
    return res.json(await amenitiesService.listPublic(/** @type {any} */ (req).validatedQuery));
  } catch (err) {
    return next(err);
  }
};

import { amenitiesService } from "./amenities.service.js";
import { stringParam } from "../../shared/lib/params.js";

/** @type {import("express").RequestHandler} */
export const listPublic = async (req, res, next) => {
  try {
    return res.json(await amenitiesService.listPublic(/** @type {any} */ (req).validatedQuery));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const listAdmin = async (req, res, next) => {
  try {
    return res.json(await amenitiesService.listAdmin(/** @type {any} */ (req).validatedQuery));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const create = async (req, res, next) => {
  try {
    return res.status(201).json(await amenitiesService.create(req.body));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const update = async (req, res, next) => {
  try {
    return res.json(await amenitiesService.update(stringParam(req, "id"), req.body));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const remove = async (req, res, next) => {
  try {
    return res.json(await amenitiesService.remove(stringParam(req, "id")));
  } catch (err) {
    return next(err);
  }
};

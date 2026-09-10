import { workspacesService } from "./workspaces.service.js";
import { stringParam } from "../../shared/lib/params.js";

/** @type {import("express").RequestHandler} */
export const listPublic = async (req, res, next) => {
  try {
    return res.json(await workspacesService.listPublic(/** @type {any} */ (req).validatedQuery));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const getById = async (req, res, next) => {
  try {
    return res.json(await workspacesService.getById(stringParam(req, "id")));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const getAvailability = async (req, res, next) => {
  try {
    const { date } = /** @type {any} */ (req).validatedQuery;
    return res.json(await workspacesService.getAvailability(stringParam(req, "id"), date));
  } catch (err) {
    return next(err);
  }
};

import { workspacesService } from "./workspaces.service.js";
import { stringParam } from "../../shared/lib/params.js";
import { HTTP_STATUS } from "../../shared/constants/http-status.js";

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

/** @type {import("express").RequestHandler} */
export const listAdmin = async (req, res, next) => {
  try {
    return res.json(await workspacesService.listAdmin(/** @type {any} */ (req).validatedQuery));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const create = async (req, res, next) => {
  try {
    return res.status(HTTP_STATUS.CREATED).json(await workspacesService.create(req.body));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const update = async (req, res, next) => {
  try {
    return res.json(await workspacesService.update(stringParam(req, "id"), req.body));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const remove = async (req, res, next) => {
  try {
    return res.json(await workspacesService.remove(stringParam(req, "id")));
  } catch (err) {
    return next(err);
  }
};

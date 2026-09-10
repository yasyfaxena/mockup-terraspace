import { bookingsService } from "./bookings.service.js";
import { asAuthed } from "../../shared/types/express.jsdoc.js";
import { stringParam } from "../../shared/lib/params.js";
import { HTTP_STATUS } from "../../shared/constants/http-status.js";

/** @type {import("express").RequestHandler} */
export const create = async (req, res, next) => {
  try {
    return res
      .status(HTTP_STATUS.CREATED)
      .json(await bookingsService.create(asAuthed(req).user.id, req.body));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const list = async (req, res, next) => {
  try {
    const query = /** @type {any} */ (req).validatedQuery;
    return res.json(await bookingsService.list(asAuthed(req).user.id, query));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const getByReference = async (req, res, next) => {
  try {
    const reference = stringParam(req, "reference");
    return res.json(await bookingsService.getByReference(asAuthed(req).user.id, reference));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const cancel = async (req, res, next) => {
  try {
    const { id, role } = asAuthed(req).user;
    return res.json(await bookingsService.cancel({ id, role }, stringParam(req, "id")));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const listAdmin = async (req, res, next) => {
  try {
    return res.json(await bookingsService.listAdmin(/** @type {any} */ (req).validatedQuery));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const getAdminDetail = async (req, res, next) => {
  try {
    return res.json(await bookingsService.getAdminDetail(stringParam(req, "id")));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const createStaff = async (req, res, next) => {
  try {
    return res.status(HTTP_STATUS.CREATED).json(await bookingsService.createStaff(req.body));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const updateAdmin = async (req, res, next) => {
  try {
    return res.json(await bookingsService.updateAdmin(stringParam(req, "id"), req.body));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const remove = async (req, res, next) => {
  try {
    return res.json(await bookingsService.remove(stringParam(req, "id")));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const calendar = async (req, res, next) => {
  try {
    return res.json(await bookingsService.calendar(/** @type {any} */ (req).validatedQuery));
  } catch (err) {
    return next(err);
  }
};

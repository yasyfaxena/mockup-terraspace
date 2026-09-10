import { fromNodeHeaders } from "better-auth/node";
import { usersService } from "./users.service.js";
import { asAuthed } from "../../shared/types/express.jsdoc.js";
import { HTTP_STATUS } from "../../shared/constants/http-status.js";
import { stringParam } from "../../shared/lib/params.js";

/**
 * @param {import("express").Request} req
 * @returns {string}
 */
function paramId(req) {
  return stringParam(req, "id");
}

/** @type {import("express").RequestHandler} */
export const getMe = async (req, res, next) => {
  try {
    return res.json(await usersService.getMe(asAuthed(req).user.id));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const updateMe = async (req, res, next) => {
  try {
    return res.json(await usersService.updateMe(asAuthed(req).user.id, req.body));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const listAdmin = async (req, res, next) => {
  try {
    return res.json(await usersService.listAdmin(/** @type {any} */ (req).validatedQuery));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const getAdminDetail = async (req, res, next) => {
  try {
    return res.json(await usersService.getAdminDetail(paramId(req)));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const createUser = async (req, res, next) => {
  try {
    const headers = fromNodeHeaders(req.headers);
    return res
      .status(HTTP_STATUS.CREATED)
      .json(await usersService.createUser(req.body, { headers }));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const updateAdminUser = async (req, res, next) => {
  try {
    const headers = fromNodeHeaders(req.headers);
    return res.json(await usersService.updateAdminUser(paramId(req), req.body, { headers }));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const deleteUser = async (req, res, next) => {
  try {
    const headers = fromNodeHeaders(req.headers);
    const actorId = asAuthed(req).user.id;
    return res.json(await usersService.deleteUser(paramId(req), { actorId, headers }));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const banUser = async (req, res, next) => {
  try {
    const headers = fromNodeHeaders(req.headers);
    const actorId = asAuthed(req).user.id;
    return res.json(await usersService.banUser(paramId(req), req.body, { actorId, headers }));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const unbanUser = async (req, res, next) => {
  try {
    const headers = fromNodeHeaders(req.headers);
    return res.json(await usersService.unbanUser(paramId(req), { headers }));
  } catch (err) {
    return next(err);
  }
};

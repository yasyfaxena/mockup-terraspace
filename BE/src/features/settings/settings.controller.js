import { settingsService } from "./settings.service.js";
import { asAuthed } from "../../shared/types/express.jsdoc.js";

/** @type {import("express").RequestHandler} */
export const publicSettings = async (_req, res, next) => {
  try {
    return res.json(await settingsService.getPublicSettings());
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const adminGetSettings = async (_req, res, next) => {
  try {
    return res.json(await settingsService.getAdminSettings());
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const adminUpdateSettings = async (req, res, next) => {
  try {
    return res.json(await settingsService.updateSettings(req.body, asAuthed(req).user.id));
  } catch (err) {
    return next(err);
  }
};

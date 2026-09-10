import { reportsService } from "./reports.service.js";

/** @type {import("express").RequestHandler} */
export const overview = async (req, res, next) => {
  try {
    return res.json(await reportsService.getOverview(/** @type {any} */ (req).validatedQuery));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const revenue = async (req, res, next) => {
  try {
    return res.json(await reportsService.getRevenue(/** @type {any} */ (req).validatedQuery));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const occupancy = async (req, res, next) => {
  try {
    return res.json(await reportsService.getOccupancy(/** @type {any} */ (req).validatedQuery));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const paymentsReport = async (req, res, next) => {
  try {
    return res.json(
      await reportsService.getPaymentsReport(/** @type {any} */ (req).validatedQuery),
    );
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const activity = async (req, res, next) => {
  try {
    return res.json(await reportsService.getActivity(/** @type {any} */ (req).validatedQuery));
  } catch (err) {
    return next(err);
  }
};

/**
 * A failure after streaming has started cannot fall back to the JSON
 * error envelope — headers are already sent. Only a pre-stream failure
 * (e.g. a DB error on the very first batch) reaches the normal handler;
 * anything later just ends the response, leaving a truncated file.
 * @type {import("express").RequestHandler}
 */
export const exportReport = async (req, res, next) => {
  try {
    await reportsService.streamExport(res, /** @type {any} */ (req).validatedQuery);
    return undefined;
  } catch (err) {
    if (res.headersSent) return res.end();
    return next(err);
  }
};

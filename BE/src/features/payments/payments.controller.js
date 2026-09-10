import { paymentsService } from "./payments.service.js";
import { asAuthed } from "../../shared/types/express.jsdoc.js";
import { stringParam } from "../../shared/lib/params.js";
import { HTTP_STATUS } from "../../shared/constants/http-status.js";

/** @type {import("express").RequestHandler} */
export const listPaymentMethods = async (req, res, next) => {
  try {
    const { provider } = /** @type {any} */ (req).validatedQuery;
    return res.json(await paymentsService.listPaymentMethods(provider));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const createCharge = async (req, res, next) => {
  try {
    const payment = await paymentsService.createCharge(
      asAuthed(req).user.id,
      stringParam(req, "id"),
      req.body,
    );
    return res.status(HTTP_STATUS.CREATED).json(payment);
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const getPaymentStatus = async (req, res, next) => {
  try {
    const reference = stringParam(req, "reference");
    return res.json(await paymentsService.getPaymentStatus(asAuthed(req).user.id, reference));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const listAdmin = async (req, res, next) => {
  try {
    return res.json(await paymentsService.listAdmin(/** @type {any} */ (req).validatedQuery));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const getAdminDetail = async (req, res, next) => {
  try {
    return res.json(await paymentsService.getAdminDetail(stringParam(req, "id")));
  } catch (err) {
    return next(err);
  }
};

/** @type {import("express").RequestHandler} */
export const refund = async (req, res, next) => {
  try {
    const result = await paymentsService.refund(
      stringParam(req, "id"),
      req.body,
      asAuthed(req).user.id,
    );
    return res.status(HTTP_STATUS.CREATED).json(result);
  } catch (err) {
    return next(err);
  }
};

/**
 * Answers with a status code only — `200`/`401`, never the JSON error
 * envelope (error-handling.md §11's webhook exception). A genuinely
 * unexpected exception still falls through to `next(err)`; PayBridge
 * treats any non-2xx as retryable, which is correct for a real transient
 * failure on our side (payments.md §7).
 * @type {import("express").RequestHandler}
 */
export const webhook = async (req, res, next) => {
  try {
    const rawBody = req.body instanceof Buffer ? req.body.toString("utf8") : String(req.body ?? "");
    const { verified } = await paymentsService.processWebhook({
      method: req.method,
      path: req.path,
      rawBody,
      headers: {
        "x-key-id": /** @type {string | undefined} */ (req.headers["x-key-id"]),
        "x-timestamp": /** @type {string | undefined} */ (req.headers["x-timestamp"]),
        "x-nonce": /** @type {string | undefined} */ (req.headers["x-nonce"]),
        "x-request-expiry": /** @type {string | undefined} */ (req.headers["x-request-expiry"]),
        "x-signature": /** @type {string | undefined} */ (req.headers["x-signature"]),
      },
    });
    return res.sendStatus(verified ? HTTP_STATUS.OK : HTTP_STATUS.UNAUTHENTICATED);
  } catch (err) {
    return next(err);
  }
};

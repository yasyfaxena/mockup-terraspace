import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth.config.js";
import { UnauthorizedError, ForbiddenError } from "../../shared/errors/index.js";

/**
 * Resolves the session from the request's cookies and attaches it to
 * `req.user`/`req.session`. Responds `401 UNAUTHENTICATED` when there is no
 * valid session — resource ownership is checked separately, in each
 * service, never here (be-architecture.md, features/auth.md).
 * @type {import("express").RequestHandler}
 */
export async function requireAuth(req, _res, next) {
  try {
    const result = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!result) {
      return next(new UnauthorizedError("Sign in required."));
    }
    /** @type {import("../../shared/types/express.jsdoc.js").AuthenticatedRequest} */
    const authedReq = req;
    authedReq.user = result.user;
    authedReq.session = result.session;
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Requires the resolved session's role to be one of `roles`. Compose after
 * `requireAuth` — an anonymous request never reaches this guard with
 * `req.user` set, so pairing the two yields 401 for anonymous and 403 for
 * an authenticated-but-unauthorized role, per features/auth.md.
 * @param {...string} roles
 * @returns {import("express").RequestHandler}
 */
export function requireRole(...roles) {
  return (req, _res, next) => {
    /** @type {import("../../shared/types/express.jsdoc.js").AuthenticatedRequest} */
    const authedReq = req;
    if (!authedReq.user) {
      return next(new UnauthorizedError("Sign in required."));
    }
    if (!roles.includes(authedReq.user.role ?? "")) {
      return next(new ForbiddenError("You do not have permission to perform this action."));
    }
    return next();
  };
}

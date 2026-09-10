/**
 * Express types every route param as `string | string[]` (a param can
 * repeat in some route configurations). Every param this project actually
 * uses is a single path segment — coerce it once here instead of casting
 * at every call site.
 * @param {import("express").Request} req
 * @param {string} name
 * @returns {string}
 */
export function stringParam(req, name) {
  return String(req.params[name]);
}

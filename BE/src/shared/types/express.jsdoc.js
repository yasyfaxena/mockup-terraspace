/**
 * The shape Better Auth's `getSession()` returns for `user` — looser than
 * Prisma's generated `User` type (its optional fields are `| undefined`,
 * not just `| null`), since it comes from a generic auth library, not a
 * direct Prisma query.
 * @typedef {{ id: string, email: string, name: string, role?: string | null } & Record<string, unknown>} SessionUser
 */

/**
 * `req.user`/`req.session` are attached by `requireAuth`
 * (features/auth/auth.guards.js), not declared on Express's own `Request`
 * type. Cast with this typedef wherever a handler reads them, rather than
 * augmenting the global `Express.Request` interface — that would need a
 * `.d.ts` file, and this project has none (be-architecture.md).
 * @typedef {import("express").Request & {
 *   user?: SessionUser,
 *   session?: { id: string, token: string, expiresAt: Date, userId: string, impersonatedBy?: string | null },
 * }} AuthenticatedRequest
 */

/**
 * Same shape, but `user`/`session` are required — for controllers reached
 * only after `requireAuth` has already run and guaranteed both are set.
 * Use {@link asAuthed} to cast a plain `Request` to this shape.
 * @typedef {import("express").Request & {
 *   user: SessionUser,
 *   session: { id: string, token: string, expiresAt: Date, userId: string, impersonatedBy?: string | null },
 * }} AuthedRequest
 */

/**
 * @param {import("express").Request} req
 * @returns {AuthedRequest}
 */
export function asAuthed(req) {
  return /** @type {AuthedRequest} */ (req);
}

import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.config.js";

/**
 * Mounts the Better Auth handler directly on the Express app at
 * `/api/auth/*` — unversioned, outside `/api/v1` (features/auth.md).
 *
 * Must run **before** `express.json()`. Better Auth reads the raw request
 * body itself; if body-parsing already consumed the stream, every sign-in
 * fails with an opaque error that looks like bad credentials
 * (libraries.md §2).
 * @param {import("express").Express} app
 */
export function mountAuthHandler(app) {
  app.all("/api/auth/*splat", toNodeHandler(auth));
}

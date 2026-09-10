import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { requireAuth, requireRole } from "../auth/index.js";
import {
  updateMeSchema,
  listUsersQuerySchema,
  createUserSchema,
  adminUpdateUserSchema,
  banUserSchema,
} from "./users.schema.js";
import {
  getMe,
  updateMe,
  listAdmin,
  getAdminDetail,
  createUser,
  updateAdminUser,
  deleteUser,
  banUser,
  unbanUser,
} from "./users.controller.js";

/** Mounted at `/me` — see shared/router.js. */
export const usersRouter = Router();
usersRouter.get("/", requireAuth, getMe);
usersRouter.patch("/", requireAuth, validate({ body: updateMeSchema }), updateMe);

/** Mounted at `/admin/users` — see shared/router.js. */
export const adminUsersRouter = Router();
const requireAdmin = [requireAuth, requireRole("admin")];

adminUsersRouter.get("/", ...requireAdmin, validate({ query: listUsersQuerySchema }), listAdmin);
adminUsersRouter.post("/", ...requireAdmin, validate({ body: createUserSchema }), createUser);
adminUsersRouter.get("/:id", ...requireAdmin, getAdminDetail);
adminUsersRouter.patch(
  "/:id",
  ...requireAdmin,
  validate({ body: adminUpdateUserSchema }),
  updateAdminUser,
);
adminUsersRouter.delete("/:id", ...requireAdmin, deleteUser);
adminUsersRouter.post("/:id/ban", ...requireAdmin, validate({ body: banUserSchema }), banUser);
adminUsersRouter.post("/:id/unban", ...requireAdmin, unbanUser);

import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { requireAuth, requireRole } from "../auth/index.js";
import { updateSettingsSchema } from "./settings.schema.js";
import { publicSettings, adminGetSettings, adminUpdateSettings } from "./settings.controller.js";

/** Mounted at `/settings/public` — see shared/router.js. */
export const publicSettingsRouter = Router();
publicSettingsRouter.get("/", publicSettings);

/** Mounted at `/admin/settings` — see shared/router.js. Admin only — these values move money. */
export const adminSettingsRouter = Router();
const requireAdmin = [requireAuth, requireRole("admin")];

adminSettingsRouter.get("/", ...requireAdmin, adminGetSettings);
adminSettingsRouter.put(
  "/",
  ...requireAdmin,
  validate({ body: updateSettingsSchema }),
  adminUpdateSettings,
);

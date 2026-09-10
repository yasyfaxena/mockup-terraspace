import { Router } from "express";
import { validate } from "../../shared/middleware/validate.js";
import { requireAuth, requireRole } from "../auth/index.js";
import {
  overviewQuerySchema,
  revenueQuerySchema,
  occupancyQuerySchema,
  paymentsReportQuerySchema,
  activityQuerySchema,
  exportQuerySchema,
} from "./reports.schema.js";
import {
  overview,
  revenue,
  occupancy,
  paymentsReport,
  activity,
  exportReport,
} from "./reports.controller.js";

/** Mounted at `/admin` — see shared/router.js. */
export const reportsRouter = Router();
const requireStaff = [requireAuth, requireRole("staff", "admin")];
const requireAdmin = [requireAuth, requireRole("admin")];

reportsRouter.get(
  "/reports/overview",
  ...requireStaff,
  validate({ query: overviewQuerySchema }),
  overview,
);
reportsRouter.get(
  "/reports/revenue",
  ...requireAdmin,
  validate({ query: revenueQuerySchema }),
  revenue,
);
reportsRouter.get(
  "/reports/occupancy",
  ...requireAdmin,
  validate({ query: occupancyQuerySchema }),
  occupancy,
);
reportsRouter.get(
  "/reports/payments",
  ...requireAdmin,
  validate({ query: paymentsReportQuerySchema }),
  paymentsReport,
);
reportsRouter.get("/activity", ...requireStaff, validate({ query: activityQuerySchema }), activity);
reportsRouter.get(
  "/reports/export",
  ...requireAdmin,
  validate({ query: exportQuerySchema }),
  exportReport,
);

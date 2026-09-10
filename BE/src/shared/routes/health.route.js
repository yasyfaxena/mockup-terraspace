import { Router } from "express";
import { prisma } from "../database/client.js";
import { logger } from "../lib/logger.js";
import { HTTP_STATUS } from "../constants/http-status.js";

export const healthRouter = Router();

/**
 * Liveness + DB connectivity check.
 * 200 when the database answers; 503 otherwise.
 */
healthRouter.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(HTTP_STATUS.OK).json({ status: "healthy" });
  } catch (err) {
    logger.error({ err }, "Health check failed");
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({ status: "unhealthy" });
  }
});

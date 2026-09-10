import { Router } from "express";
import { prisma } from "../database/client.js";
import { logger } from "../lib/logger.js";

export const healthRouter = Router();

/**
 * Liveness + DB connectivity check.
 * 200 when the database answers; 503 otherwise.
 */
healthRouter.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "healthy" });
  } catch (err) {
    logger.error({ err }, "Health check failed");
    res.status(503).json({ status: "unhealthy" });
  }
});

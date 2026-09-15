import { app } from "./app.js";
import { env } from "./shared/config/env.js";
import { logger } from "./shared/lib/logger.js";
import { prisma } from "./shared/database/client.js";

// ── Health check ────────────────────────────────────────────
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "healthy" });
  } catch (err) {
    logger.error({ err }, "Health check failed");
    res.status(503).json({ status: "unhealthy" });
  }
});

// ── Boot ────────────────────────────────────────────────────
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "Server started");
});

// ── Graceful shutdown ───────────────────────────────────────
async function shutdown(code = 0) {
  logger.info("Shutting down…");
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("Disconnected from database");
    process.exit(code);
  });

  // Force-kill after 10 seconds if draining stalls
  setTimeout(() => {
    logger.warn("Forcing shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled rejection");
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception — shutting down");
  shutdown(1);
});

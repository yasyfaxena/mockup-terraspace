import { app } from "./app.js";
import { env } from "./shared/config/env.js";
import { logger } from "./shared/lib/logger.js";
import { prisma } from "./shared/database/client.js";
import { startJobs } from "./jobs/index.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

// ── Boot ────────────────────────────────────────────────────
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "Server started");
});

startJobs();

// ── Graceful shutdown ───────────────────────────────────────
async function shutdown(code = 0) {
  logger.info("Shutting down…");
  server.close(async () => {
    await prisma.$disconnect();
    logger.info("Disconnected from database");
    // eslint-disable-next-line n/no-process-exit -- terminal shutdown step, nothing left to throw to
    process.exit(code);
  });

  // Force-kill after 10 seconds if draining stalls
  setTimeout(() => {
    logger.warn("Forcing shutdown after timeout");
    // eslint-disable-next-line n/no-process-exit -- terminal shutdown step, nothing left to throw to
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
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

import { createContainer, InjectionMode, asValue } from "awilix";
import { prisma } from "./database/client.js";
import { logger } from "./lib/logger.js";

export const container = createContainer({
  injectionMode: InjectionMode.PROXY,
  strict: true,
});

container.register({
  db: asValue(prisma),
  logger: asValue(logger),
});

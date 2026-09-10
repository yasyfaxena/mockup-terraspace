import { randomUUID } from "node:crypto";
import { prisma } from "../../src/shared/database/client.js";

let counter = 0;

/** @param {Partial<import("@prisma/client").User>} [overrides] */
export function buildUser(overrides = {}) {
  counter += 1;
  return {
    id: randomUUID(),
    name: `Test User ${counter}`,
    email: `test-user-${counter}-${randomUUID()}@example.test`,
    role: "customer",
    ...overrides,
  };
}

/** Persists a user directly — bypasses Better Auth, for schema-level tests only. */
export async function seedUser(overrides = {}) {
  return prisma.user.create({ data: buildUser(overrides) });
}

import { randomUUID } from "node:crypto";
import { prisma } from "../../src/shared/database/client.js";

let counter = 0;

/** @param {Partial<import("@prisma/client").Location>} [overrides] */
export function buildLocation(overrides = {}) {
  counter += 1;
  return {
    slug: `test-location-${counter}-${randomUUID().slice(0, 8)}`,
    name: `Test Location ${counter}`,
    address: "Jl. Test No. 1",
    city: "Jakarta",
    timezone: "Asia/Jakarta",
    ...overrides,
  };
}

export async function seedLocation(overrides = {}) {
  return prisma.location.create({ data: buildLocation(overrides) });
}

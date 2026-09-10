import { prisma } from "../../src/shared/database/client.js";
import { seedLocation } from "./location.factory.js";

let counter = 0;

/** @param {Partial<import("@prisma/client").Workspace>} [overrides] */
export function buildWorkspace(overrides = {}) {
  counter += 1;
  return {
    name: `Test Workspace ${counter}`,
    type: "meeting_room",
    pricePerHour: "50000.00",
    availability: "available",
    ...overrides,
  };
}

/** Persists, creating a location when `locationId` is not supplied. */
export async function seedWorkspace(overrides = {}) {
  const { locationId, ...rest } = overrides;
  const resolvedLocationId = locationId ?? (await seedLocation()).id;
  return prisma.workspace.create({
    data: { ...buildWorkspace(rest), locationId: resolvedLocationId },
  });
}

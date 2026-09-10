import { randomUUID } from "node:crypto";
import { prisma } from "../../src/shared/database/client.js";

let counter = 0;

/** @param {Partial<import("@prisma/client").Amenity>} [overrides] */
export function buildAmenity(overrides = {}) {
  counter += 1;
  return {
    name: `Test Amenity ${counter}-${randomUUID().slice(0, 6)}`,
    category: "General",
    icon: "tag",
    status: "active",
    ...overrides,
  };
}

export async function seedAmenity(overrides = {}) {
  return prisma.amenity.create({ data: buildAmenity(overrides) });
}

/** @param {string} locationId @param {string} amenityId */
export function linkLocationAmenity(locationId, amenityId) {
  return prisma.locationAmenity.create({ data: { locationId, amenityId } });
}

/** @param {string} workspaceId @param {string} amenityId */
export function linkWorkspaceAmenity(workspaceId, amenityId) {
  return prisma.workspaceAmenity.create({ data: { workspaceId, amenityId } });
}

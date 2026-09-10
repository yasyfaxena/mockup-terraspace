import { prisma } from "../../src/shared/database/client.js";

/**
 * Truncates every table and reseeds the `admin_settings` singleton.
 * Truncate, not a wrapped transaction — booking creation runs inside
 * `prisma.$transaction`, and Prisma does not support nested transactions
 * (testing.md §6).
 */
export async function resetDb() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE payment_events, refunds, payments, bookings,
             workspace_amenities, location_amenities, workspaces, locations,
             amenities, sessions, accounts, verifications, users
    RESTART IDENTITY CASCADE
  `);
  await seedAdminSettings();
}

export async function seedAdminSettings(overrides = {}) {
  return prisma.adminSettings.upsert({
    where: { id: true },
    create: { id: true, ...overrides },
    update: overrides,
  });
}

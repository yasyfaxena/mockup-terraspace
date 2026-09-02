import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = db;
}

// Seed default admin settings if they don't exist
db.adminSettings
  .upsert({
    where: { id: true },
    update: {},
    create: { id: true },
  })
  .catch((err) => {
    console.error("Error seeding default admin settings:", err);
  });

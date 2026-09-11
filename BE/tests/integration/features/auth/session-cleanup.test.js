import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "../../../../src/shared/database/client.js";
import { authService } from "../../../../src/features/auth/index.js";
import { seedUser } from "../../../factories/user.factory.js";

const ONE_HOUR_MS = 3_600_000;

describe("AuthService.cleanupExpired (development-phases.md Phase 8)", () => {
  it("deletes only sessions and verifications past their expiresAt", async () => {
    const user = await seedUser();
    const now = Date.now();

    const expiredSession = await prisma.session.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        token: randomUUID(),
        expiresAt: new Date(now - ONE_HOUR_MS),
      },
    });
    const liveSession = await prisma.session.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        token: randomUUID(),
        expiresAt: new Date(now + ONE_HOUR_MS),
      },
    });
    const expiredVerification = await prisma.verification.create({
      data: {
        id: randomUUID(),
        identifier: "expired@test.com",
        value: "token-expired",
        expiresAt: new Date(now - ONE_HOUR_MS),
      },
    });
    const liveVerification = await prisma.verification.create({
      data: {
        id: randomUUID(),
        identifier: "live@test.com",
        value: "token-live",
        expiresAt: new Date(now + ONE_HOUR_MS),
      },
    });

    const result = await authService.cleanupExpired();

    expect(result).toEqual({ sessions: 1, verifications: 1 });
    expect(await prisma.session.findUnique({ where: { id: expiredSession.id } })).toBeNull();
    expect(await prisma.session.findUnique({ where: { id: liveSession.id } })).not.toBeNull();
    expect(
      await prisma.verification.findUnique({ where: { id: expiredVerification.id } }),
    ).toBeNull();
    expect(
      await prisma.verification.findUnique({ where: { id: liveVerification.id } }),
    ).not.toBeNull();
  });
});

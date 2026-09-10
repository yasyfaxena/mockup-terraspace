import { describe, it, expect } from "vitest";
import { prisma } from "../../../src/shared/database/client.js";
import { isExclusionViolation } from "../../../src/shared/errors/prisma-mapper.js";
import { seedWorkspace } from "../../factories/workspace.factory.js";
import { seedUser } from "../../factories/user.factory.js";
import { buildBooking } from "../../factories/booking.factory.js";

/**
 * Proves the single most important guarantee in the schema (erd-spec.md
 * §13): the `bookings_no_overlap` GiST exclusion constraint. Nothing here
 * can be faked with a mock — the behaviour lives in PostgreSQL.
 */
describe("bookings_no_overlap exclusion constraint", () => {
  it("allows exactly one of two concurrent overlapping bookings for the same workspace", async () => {
    const workspace = await seedWorkspace();
    const [userA, userB] = await Promise.all([seedUser(), seedUser()]);
    const payload = { workspaceId: workspace.id, startTime: "09:00", endTime: "12:00" };

    const results = await Promise.allSettled([
      prisma.booking.create({ data: { ...buildBooking(payload), userId: userA.id } }),
      prisma.booking.create({ data: { ...buildBooking(payload), userId: userB.id } }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    expect(isExclusionViolation(rejected[0].reason)).toBe(true);

    const confirmedCount = await prisma.booking.count({
      where: { workspaceId: workspace.id, status: { in: ["pending", "confirmed"] } },
    });
    expect(confirmedCount).toBe(1);
  });

  it.each([
    ["09:00", "12:00", false], // identical
    ["10:00", "11:00", false], // contained
    ["08:00", "10:00", false], // overlaps start
    ["11:00", "13:00", false], // overlaps end
    ["12:00", "14:00", true], // starts exactly at end — '[)' bound, no clash
    ["07:00", "09:00", true], // ends exactly at start
  ])(
    "%s–%s against an existing 09:00–12:00 → succeeds=%s",
    async (startTime, endTime, shouldSucceed) => {
      const workspace = await seedWorkspace();
      const [userA, userB] = await Promise.all([seedUser(), seedUser()]);

      await prisma.booking.create({
        data: {
          ...buildBooking({ workspaceId: workspace.id, startTime: "09:00", endTime: "12:00" }),
          userId: userA.id,
        },
      });

      const attempt = prisma.booking.create({
        data: {
          ...buildBooking({ workspaceId: workspace.id, startTime, endTime }),
          userId: userB.id,
        },
      });

      if (shouldSucceed) {
        await expect(attempt).resolves.toMatchObject({ workspaceId: workspace.id });
      } else {
        await expect(attempt).rejects.toSatisfy(isExclusionViolation);
      }
    },
  );

  it("cancelling a booking releases the slot for a new overlapping booking", async () => {
    const workspace = await seedWorkspace();
    const [userA, userB] = await Promise.all([seedUser(), seedUser()]);
    const payload = { workspaceId: workspace.id, startTime: "09:00", endTime: "12:00" };

    const first = await prisma.booking.create({
      data: { ...buildBooking(payload), userId: userA.id },
    });

    await prisma.booking.update({
      where: { id: first.id },
      data: { status: "cancelled", cancelledAt: new Date() },
    });

    await expect(
      prisma.booking.create({ data: { ...buildBooking(payload), userId: userB.id } }),
    ).resolves.toMatchObject({ workspaceId: workspace.id });
  });
});

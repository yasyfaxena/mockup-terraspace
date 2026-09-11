import { describe, it, expect } from "vitest";
import { bookingsService } from "../../../../src/features/bookings/index.js";
import { prisma } from "../../../../src/shared/database/client.js";
import { seedLocation } from "../../../factories/location.factory.js";
import { seedWorkspace } from "../../../factories/workspace.factory.js";
import { seedBooking } from "../../../factories/booking.factory.js";

describe("BookingsService.completeElapsed (development-phases.md Phase 8)", () => {
  it("promotes a confirmed booking whose local end time has passed to completed", async () => {
    const location = await seedLocation({ timezone: "Asia/Jakarta" });
    const workspace = await seedWorkspace({ locationId: location.id });
    const elapsed = await seedBooking({
      workspaceId: workspace.id,
      status: "confirmed",
      bookingDate: "2020-01-01",
      startTime: "09:00",
      endTime: "12:00",
    });

    const result = await bookingsService.completeElapsed();

    expect(result.completed).toBeGreaterThanOrEqual(1);
    const persisted = await prisma.booking.findUnique({ where: { id: elapsed.id } });
    expect(persisted.status).toBe("completed");
  });

  it("leaves a confirmed booking whose local end time has not passed alone", async () => {
    const location = await seedLocation({ timezone: "Asia/Jakarta" });
    const workspace = await seedWorkspace({ locationId: location.id });
    const future = await seedBooking({
      workspaceId: workspace.id,
      status: "confirmed",
      bookingDate: "2030-01-01",
      startTime: "09:00",
      endTime: "12:00",
    });

    await bookingsService.completeElapsed();

    const persisted = await prisma.booking.findUnique({ where: { id: future.id } });
    expect(persisted.status).toBe("confirmed");
  });

  it("never touches a pending or cancelled booking, even if elapsed", async () => {
    const location = await seedLocation({ timezone: "Asia/Jakarta" });
    const workspace = await seedWorkspace({ locationId: location.id });
    const pending = await seedBooking({
      workspaceId: workspace.id,
      status: "pending",
      bookingDate: "2020-01-01",
      startTime: "09:00",
      endTime: "12:00",
    });

    await bookingsService.completeElapsed();

    const persisted = await prisma.booking.findUnique({ where: { id: pending.id } });
    expect(persisted.status).toBe("pending");
  });
});

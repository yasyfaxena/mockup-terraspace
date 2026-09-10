import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../../../src/app.js";
import { prisma } from "../../../../src/shared/database/client.js";
import { seedLocation } from "../../../factories/location.factory.js";
import { seedWorkspace } from "../../../factories/workspace.factory.js";
import { seedBooking } from "../../../factories/booking.factory.js";
import { createUserAndSignIn } from "../../../helpers/auth.js";

describe("GET /workspaces (workspaces.md §1)", () => {
  it("is paginated and excludes disabled workspaces", async () => {
    const location = await seedLocation();
    await seedWorkspace({ locationId: location.id, availability: "available" });
    const disabled = await seedWorkspace({ locationId: location.id, availability: "disabled" });

    const res = await request(app).get("/api/v1/workspaces");

    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20 });
    expect(res.body.data.map((entry) => entry.id)).not.toContain(disabled.id);
  });

  it("excludes workspaces at an inactive location", async () => {
    const location = await seedLocation({ status: "inactive" });
    const workspace = await seedWorkspace({ locationId: location.id });

    const res = await request(app).get("/api/v1/workspaces");
    expect(res.body.data.map((entry) => entry.id)).not.toContain(workspace.id);
  });

  it("rejects a limit above the maximum", async () => {
    const res = await request(app).get("/api/v1/workspaces?limit=500");
    expect(res.status).toBe(422);
  });

  it("filters by type and price range", async () => {
    const location = await seedLocation();
    const cheap = await seedWorkspace({
      locationId: location.id,
      type: "hot_desk",
      pricePerHour: "5000.00",
    });
    await seedWorkspace({
      locationId: location.id,
      type: "meeting_room",
      pricePerHour: "80000.00",
    });

    const res = await request(app).get("/api/v1/workspaces?type=hot_desk&maxPrice=10000");
    expect(res.body.data.map((entry) => entry.id)).toEqual([cheap.id]);
  });

  it("money is always a decimal string, never a number", async () => {
    await seedWorkspace();
    const res = await request(app).get("/api/v1/workspaces");
    for (const entry of res.body.data) {
      expect(typeof entry.pricePerHour).toBe("string");
    }
  });
});

describe("GET /workspaces/:id (workspaces.md §2)", () => {
  it("includes a live pricing quote", async () => {
    const workspace = await seedWorkspace({ pricePerHour: "50000.00" });
    const res = await request(app).get(`/api/v1/workspaces/${workspace.id}`);

    expect(res.status).toBe(200);
    expect(res.body.pricing).toMatchObject({
      pricePerHour: "50000.00",
      currency: "IDR",
      minimumDurationMinutes: 30,
    });
  });

  it("returns 404 for a disabled workspace", async () => {
    const workspace = await seedWorkspace({ availability: "disabled" });
    const res = await request(app).get(`/api/v1/workspaces/${workspace.id}`);
    expect(res.status).toBe(404);
  });
});

describe("GET /workspaces/:id/availability (workspaces.md §3)", () => {
  it("computes free/busy intervals without leaking booking identity", async () => {
    const workspace = await seedWorkspace();
    const booking = await seedBooking({
      workspaceId: workspace.id,
      startTime: "09:00",
      endTime: "12:00",
    });

    const res = await request(app)
      .get(`/api/v1/workspaces/${workspace.id}/availability`)
      .query({ date: "2026-09-15" });

    expect(res.status).toBe(200);
    expect(res.body.busy).toEqual([{ from: "09:00", to: "12:00" }]);
    expect(res.body.available).toEqual([{ from: "12:00", to: "22:00" }]);

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain(booking.id);
    expect(serialized).not.toContain(booking.reference);
  });

  it("only pending/confirmed bookings block — cancelled releases the slot", async () => {
    const workspace = await seedWorkspace();
    const booking = await seedBooking({
      workspaceId: workspace.id,
      startTime: "09:00",
      endTime: "12:00",
    });
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "cancelled", cancelledAt: new Date() },
    });

    const res = await request(app)
      .get(`/api/v1/workspaces/${workspace.id}/availability`)
      .query({ date: "2026-09-15" });

    expect(res.body.busy).toEqual([]);
  });

  it("rejects a past date", async () => {
    const workspace = await seedWorkspace();
    const res = await request(app)
      .get(`/api/v1/workspaces/${workspace.id}/availability`)
      .query({ date: "2020-01-01" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("BOOKING_IN_PAST");
  });

  it("rejects a date beyond advanceBookingDays", async () => {
    const workspace = await seedWorkspace();
    const res = await request(app)
      .get(`/api/v1/workspaces/${workspace.id}/availability`)
      .query({ date: "2030-01-01" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("BOOKING_TOO_FAR_AHEAD");
  });

  it("returns 404 for a non-bookable workspace", async () => {
    const workspace = await seedWorkspace({ availability: "disabled" });
    const res = await request(app)
      .get(`/api/v1/workspaces/${workspace.id}/availability`)
      .query({ date: "2026-09-15" });
    expect(res.status).toBe(404);
  });
});

describe("Admin workspaces (workspaces.md §4–7)", () => {
  it("rejects creating against a locationId that does not exist", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const res = await request(app)
      .post("/api/v1/admin/workspaces")
      .set("Cookie", cookie)
      .send({ locationId: "00000000-0000-0000-0000-000000000000", name: "Test", type: "hot_desk" });

    expect(res.status).toBe(404);
  });

  it("creates a workspace against a real location", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const location = await seedLocation();

    const res = await request(app)
      .post("/api/v1/admin/workspaces")
      .set("Cookie", cookie)
      .send({ locationId: location.id, name: "New Room", type: "meeting_room" });

    expect(res.status).toBe(201);
    expect(res.body.locationId).toBe(location.id);
    expect(res.body.activeBookingCount).toBe(0);
  });

  it("includes disabled workspaces and those at inactive locations", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const disabled = await seedWorkspace({ availability: "disabled" });
    const inactiveLocation = await seedLocation({ status: "inactive" });
    const atInactiveLocation = await seedWorkspace({ locationId: inactiveLocation.id });

    const res = await request(app).get("/api/v1/admin/workspaces").set("Cookie", cookie);

    const ids = res.body.data.map((entry) => entry.id);
    expect(ids).toContain(disabled.id);
    expect(ids).toContain(atInactiveLocation.id);
  });

  it("changing pricePerHour never touches an existing booking's snapshotted unitPrice", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const workspace = await seedWorkspace({ pricePerHour: "50000.00" });
    const booking = await seedBooking({ workspaceId: workspace.id, unitPrice: 50000 });

    await request(app)
      .patch(`/api/v1/admin/workspaces/${workspace.id}`)
      .set("Cookie", cookie)
      .send({ pricePerHour: "99999.00" });

    const unchanged = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(Number(unchanged.unitPrice)).toBe(50000);
  });

  it("returns 409 for deleting a workspace with any booking, even a cancelled one — ON DELETE RESTRICT keeps booking history intact (erd-spec.md #5)", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const workspace = await seedWorkspace();
    const booking = await seedBooking({ workspaceId: workspace.id });

    const blocked = await request(app)
      .delete(`/api/v1/admin/workspaces/${workspace.id}`)
      .set("Cookie", cookie);
    expect(blocked.status).toBe(409);

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "cancelled", cancelledAt: new Date() },
    });

    // The booking row itself still exists (only its status changed), and
    // `bookings.workspace_id` is `ON DELETE RESTRICT` specifically so that
    // booking history survives catalog changes — so this stays blocked.
    const stillBlocked = await request(app)
      .delete(`/api/v1/admin/workspaces/${workspace.id}`)
      .set("Cookie", cookie);
    expect(stillBlocked.status).toBe(409);
  });

  it("deletes cleanly once a workspace has never had a booking", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const workspace = await seedWorkspace();

    const allowed = await request(app)
      .delete(`/api/v1/admin/workspaces/${workspace.id}`)
      .set("Cookie", cookie);
    expect(allowed.status).toBe(200);
  });
});

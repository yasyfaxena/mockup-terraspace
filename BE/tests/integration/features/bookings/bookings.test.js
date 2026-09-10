import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../../../src/app.js";
import { prisma } from "../../../../src/shared/database/client.js";
import { seedLocation } from "../../../factories/location.factory.js";
import { seedWorkspace } from "../../../factories/workspace.factory.js";
import { seedBooking } from "../../../factories/booking.factory.js";
import { createUserAndSignIn } from "../../../helpers/auth.js";
import { seedAdminSettings } from "../../../helpers/db.js";

const FUTURE_DATE = "2026-09-15";

/** Local-clock parts for a booking starting `minutesFromNow` minutes away, at a UTC-timezone location. */
function soonBookingParts(minutesFromNow, durationMinutes = 60) {
  const start = new Date(Date.now() + minutesFromNow * 60 * 1000);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const toHHMM = (d) => d.toISOString().slice(11, 16);
  const toYMD = (d) => d.toISOString().slice(0, 10);
  return { bookingDate: toYMD(start), startTime: toHHMM(start), endTime: toHHMM(end) };
}

describe("POST /bookings (bookings.md §1)", () => {
  it("computes the price server-side and ignores hostile amount fields (REG-001)", async () => {
    await seedAdminSettings({ taxPercent: 11 });
    const { cookie } = await createUserAndSignIn();
    const workspace = await seedWorkspace({ pricePerHour: "50000.00" });

    const res = await request(app).post("/api/v1/bookings").set("Cookie", cookie).send({
      workspaceId: workspace.id,
      bookingDate: FUTURE_DATE,
      startTime: "09:00",
      endTime: "12:00",
      total: 0,
      totalAmount: "0.00",
      unitPrice: "0.00",
    });

    expect(res.status).toBe(201);
    expect(res.body.unitPrice).toBe("50000.00");
    expect(res.body.subtotalAmount).toBe("150000.00");
    expect(res.body.taxAmount).toBe("16500.00");
    expect(res.body.totalAmount).toBe("166500.00");
    expect(res.body.status).toBe("confirmed");
    expect(res.body.paymentStatus).toBe("pending");
    expect(res.body.reference).toMatch(/^TS-[A-Z0-9]{6}$/);
    expect(res.body.accessCode).toMatch(/^TS-[A-Z0-9]{6}-[A-Z0-9]{4}$/);
  });

  it("two concurrent overlapping requests: one 201, one 409 BOOKING_SLOT_TAKEN (REG-002)", async () => {
    const { cookie } = await createUserAndSignIn();
    const workspace = await seedWorkspace();
    const payload = {
      workspaceId: workspace.id,
      bookingDate: FUTURE_DATE,
      startTime: "09:00",
      endTime: "12:00",
    };

    const [a, b] = await Promise.all([
      request(app).post("/api/v1/bookings").set("Cookie", cookie).send(payload),
      request(app).post("/api/v1/bookings").set("Cookie", cookie).send(payload),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([201, 409]);
    const conflict = a.status === 409 ? a : b;
    expect(conflict.body.error.code).toBe("BOOKING_SLOT_TAKEN");
  });

  it("returns 401 without a session", async () => {
    const res = await request(app).post("/api/v1/bookings").send({
      workspaceId: "00000000-0000-0000-0000-000000000000",
      bookingDate: FUTURE_DATE,
      startTime: "09:00",
      endTime: "10:00",
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 for a workspace that does not exist", async () => {
    const { cookie } = await createUserAndSignIn();
    const res = await request(app).post("/api/v1/bookings").set("Cookie", cookie).send({
      workspaceId: "00000000-0000-0000-0000-000000000000",
      bookingDate: FUTURE_DATE,
      startTime: "09:00",
      endTime: "10:00",
    });
    expect(res.status).toBe(404);
  });

  it("returns 409 WORKSPACE_NOT_BOOKABLE for a disabled workspace", async () => {
    const { cookie } = await createUserAndSignIn();
    const workspace = await seedWorkspace({ availability: "disabled" });
    const res = await request(app).post("/api/v1/bookings").set("Cookie", cookie).send({
      workspaceId: workspace.id,
      bookingDate: FUTURE_DATE,
      startTime: "09:00",
      endTime: "10:00",
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("WORKSPACE_NOT_BOOKABLE");
  });

  it("returns 409 LOCATION_INACTIVE", async () => {
    const { cookie } = await createUserAndSignIn();
    const location = await seedLocation({ status: "inactive" });
    const workspace = await seedWorkspace({ locationId: location.id });
    const res = await request(app).post("/api/v1/bookings").set("Cookie", cookie).send({
      workspaceId: workspace.id,
      bookingDate: FUTURE_DATE,
      startTime: "09:00",
      endTime: "10:00",
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("LOCATION_INACTIVE");
  });

  it("returns 422 BOOKING_IN_PAST", async () => {
    const { cookie } = await createUserAndSignIn();
    const workspace = await seedWorkspace();
    const res = await request(app).post("/api/v1/bookings").set("Cookie", cookie).send({
      workspaceId: workspace.id,
      bookingDate: "2020-01-01",
      startTime: "09:00",
      endTime: "10:00",
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("BOOKING_IN_PAST");
  });

  it("returns 422 BOOKING_TOO_FAR_AHEAD", async () => {
    const { cookie } = await createUserAndSignIn();
    const workspace = await seedWorkspace();
    const res = await request(app).post("/api/v1/bookings").set("Cookie", cookie).send({
      workspaceId: workspace.id,
      bookingDate: "2030-01-01",
      startTime: "09:00",
      endTime: "10:00",
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("BOOKING_TOO_FAR_AHEAD");
  });

  it("returns 422 BOOKING_MIN_DURATION under 30 minutes", async () => {
    const { cookie } = await createUserAndSignIn();
    const workspace = await seedWorkspace();
    const res = await request(app).post("/api/v1/bookings").set("Cookie", cookie).send({
      workspaceId: workspace.id,
      bookingDate: FUTURE_DATE,
      startTime: "09:00",
      endTime: "09:15",
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("BOOKING_MIN_DURATION");
  });

  it("snapshots unitPrice/currency — repricing the workspace afterward never alters the booking", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const workspace = await seedWorkspace({ pricePerHour: "50000.00" });

    const created = await request(app).post("/api/v1/bookings").set("Cookie", cookie).send({
      workspaceId: workspace.id,
      bookingDate: FUTURE_DATE,
      startTime: "09:00",
      endTime: "12:00",
    });

    await request(app)
      .patch(`/api/v1/admin/workspaces/${workspace.id}`)
      .set("Cookie", cookie)
      .send({ pricePerHour: "99999.00" });

    const unchanged = await prisma.booking.findUniqueOrThrow({ where: { id: created.body.id } });
    expect(Number(unchanged.unitPrice)).toBe(50000);
  });
});

describe("GET /bookings (bookings.md §2)", () => {
  it("is paginated, includes canCancel, and never exposes accessCode", async () => {
    const { cookie, user } = await createUserAndSignIn();
    await seedBooking({ userId: user.id, bookingDate: FUTURE_DATE });

    const res = await request(app).get("/api/v1/bookings").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20 });
    expect(res.body.data[0].canCancel).toBe(true);
    expect(res.body.data[0]).not.toHaveProperty("accessCode");
  });

  it("scope=upcoming excludes cancelled bookings", async () => {
    const { cookie, user } = await createUserAndSignIn();
    const cancelled = await seedBooking({
      userId: user.id,
      bookingDate: FUTURE_DATE,
      status: "cancelled",
      cancelledAt: new Date(),
    });
    const active = await seedBooking({ userId: user.id, bookingDate: FUTURE_DATE });

    const res = await request(app).get("/api/v1/bookings?scope=upcoming").set("Cookie", cookie);
    const ids = res.body.data.map((entry) => entry.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(cancelled.id);
  });

  it("only returns the authenticated user's own bookings", async () => {
    const { cookie, user } = await createUserAndSignIn();
    const other = await createUserAndSignIn();
    await seedBooking({ userId: other.user.id, bookingDate: FUTURE_DATE });
    const mine = await seedBooking({ userId: user.id, bookingDate: FUTURE_DATE });

    const res = await request(app).get("/api/v1/bookings").set("Cookie", cookie);
    expect(res.body.data.map((entry) => entry.id)).toEqual([mine.id]);
  });
});

describe("GET /bookings/:reference (bookings.md §3)", () => {
  it("returns the full detail shape with accessWindow and geofence", async () => {
    const { cookie, user } = await createUserAndSignIn();
    const location = await seedLocation({
      timezone: "UTC",
      latitude: "-6.2088",
      longitude: "106.8456",
    });
    const workspace = await seedWorkspace({ locationId: location.id });
    const booking = await seedBooking({
      userId: user.id,
      workspaceId: workspace.id,
      bookingDate: FUTURE_DATE,
      startTime: "09:00",
      endTime: "12:00",
    });

    const res = await request(app)
      .get(`/api/v1/bookings/${booking.reference}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.accessWindow).toEqual({
      from: `${FUTURE_DATE}T08:30:00.000Z`,
      until: `${FUTURE_DATE}T12:00:00.000Z`,
    });
    expect(res.body.location.accessRadiusMeters).toBe(50);
    expect(res.body.cancellationPolicy).toBeDefined();
    expect(res.body.accessCode).toBe(booking.accessCode);
  });

  it("returns 404, not 403, for another user's reference", async () => {
    const { cookie } = await createUserAndSignIn();
    const other = await createUserAndSignIn();
    const booking = await seedBooking({ userId: other.user.id, bookingDate: FUTURE_DATE });

    const res = await request(app)
      .get(`/api/v1/bookings/${booking.reference}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(404);
  });

  it("returns 404 for an unknown reference", async () => {
    const { cookie } = await createUserAndSignIn();
    const res = await request(app).get("/api/v1/bookings/TS-NOPE00").set("Cookie", cookie);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /bookings/:id/cancel (bookings.md §4)", () => {
  it("cancels, sets cancelledAt, and releases the slot for a new booking", async () => {
    const { cookie } = await createUserAndSignIn();
    const workspace = await seedWorkspace();

    const created = await request(app).post("/api/v1/bookings").set("Cookie", cookie).send({
      workspaceId: workspace.id,
      bookingDate: FUTURE_DATE,
      startTime: "09:00",
      endTime: "12:00",
    });

    const cancelRes = await request(app)
      .patch(`/api/v1/bookings/${created.body.id}/cancel`)
      .set("Cookie", cookie);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe("cancelled");
    expect(cancelRes.body.cancelledAt).not.toBeNull();

    const retry = await request(app).post("/api/v1/bookings").set("Cookie", cookie).send({
      workspaceId: workspace.id,
      bookingDate: FUTURE_DATE,
      startTime: "09:00",
      endTime: "12:00",
    });
    expect(retry.status).toBe(201);
  });

  it("returns 409 BOOKING_ALREADY_CANCELLED", async () => {
    const { cookie, user } = await createUserAndSignIn();
    const booking = await seedBooking({
      userId: user.id,
      bookingDate: FUTURE_DATE,
      status: "cancelled",
      cancelledAt: new Date(),
    });

    const res = await request(app)
      .patch(`/api/v1/bookings/${booking.id}/cancel`)
      .set("Cookie", cookie);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("BOOKING_ALREADY_CANCELLED");
  });

  it("returns 404 for another user's booking", async () => {
    const { cookie } = await createUserAndSignIn();
    const other = await createUserAndSignIn();
    const booking = await seedBooking({ userId: other.user.id, bookingDate: FUTURE_DATE });

    const res = await request(app)
      .patch(`/api/v1/bookings/${booking.id}/cancel`)
      .set("Cookie", cookie);
    expect(res.status).toBe(404);
  });

  it("lets staff cancel any booking", async () => {
    const { user } = await createUserAndSignIn();
    const { cookie: staffCookie } = await createUserAndSignIn({ role: "staff" });
    const booking = await seedBooking({ userId: user.id, bookingDate: FUTURE_DATE });

    const res = await request(app)
      .patch(`/api/v1/bookings/${booking.id}/cancel`)
      .set("Cookie", staffCookie);
    expect(res.status).toBe(200);
  });

  it("returns 403 BOOKING_CANCELLATION_WINDOW_CLOSED inside the window", async () => {
    const { cookie, user } = await createUserAndSignIn();
    const location = await seedLocation({ timezone: "UTC" });
    const workspace = await seedWorkspace({ locationId: location.id });
    const { bookingDate, startTime, endTime } = soonBookingParts(30); // 30 minutes away, well inside the 24h default window
    const booking = await seedBooking({
      userId: user.id,
      workspaceId: workspace.id,
      bookingDate,
      startTime,
      endTime,
    });

    const res = await request(app)
      .patch(`/api/v1/bookings/${booking.id}/cancel`)
      .set("Cookie", cookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("BOOKING_CANCELLATION_WINDOW_CLOSED");
  });
});

describe("Admin/staff bookings (bookings.md §5-10)", () => {
  it("gates admin/staff routes behind auth", async () => {
    const anon = await request(app).get("/api/v1/admin/bookings");
    expect(anon.status).toBe(401);

    const { cookie } = await createUserAndSignIn();
    const customer = await request(app).get("/api/v1/admin/bookings").set("Cookie", cookie);
    expect(customer.status).toBe(403);
  });

  it("GET /admin/bookings filters by workspaceId and status", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    const workspace = await seedWorkspace();
    const matching = await seedBooking({
      workspaceId: workspace.id,
      bookingDate: FUTURE_DATE,
      status: "confirmed",
    });
    await seedBooking({ bookingDate: FUTURE_DATE });

    const res = await request(app)
      .get(`/api/v1/admin/bookings?workspaceId=${workspace.id}&status=confirmed`)
      .set("Cookie", cookie);
    expect(res.body.data.map((entry) => entry.id)).toEqual([matching.id]);
  });

  it("GET /admin/bookings/:id returns the full row with accessCode and customer", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    const booking = await seedBooking({ bookingDate: FUTURE_DATE });

    const res = await request(app)
      .get(`/api/v1/admin/bookings/${booking.id}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.accessCode).toBe(booking.accessCode);
    expect(res.body.customer).toHaveProperty("email");
  });

  it("POST /admin/bookings waives past-date and advance-day checks, never the slot conflict", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    const { user: customer } = await createUserAndSignIn();
    const workspace = await seedWorkspace();

    const walkIn = await request(app).post("/api/v1/admin/bookings").set("Cookie", cookie).send({
      userId: customer.id,
      workspaceId: workspace.id,
      bookingDate: "2020-01-01",
      startTime: "09:00",
      endTime: "10:00",
    });
    expect(walkIn.status).toBe(201);

    const existing = await seedBooking({
      workspaceId: workspace.id,
      bookingDate: FUTURE_DATE,
      startTime: "09:00",
      endTime: "12:00",
    });
    const conflict = await request(app).post("/api/v1/admin/bookings").set("Cookie", cookie).send({
      userId: customer.id,
      workspaceId: workspace.id,
      bookingDate: FUTURE_DATE,
      startTime: "10:00",
      endTime: "11:00",
    });
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("BOOKING_SLOT_TAKEN");
    void existing;
  });

  it("POST /admin/bookings returns 404 for an unknown userId", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    const workspace = await seedWorkspace();
    const res = await request(app).post("/api/v1/admin/bookings").set("Cookie", cookie).send({
      userId: "ghost-user",
      workspaceId: workspace.id,
      bookingDate: FUTURE_DATE,
      startTime: "09:00",
      endTime: "10:00",
    });
    expect(res.status).toBe(404);
  });

  it("PATCH /admin/bookings/:id re-prices on a time change, and totalAmount is not directly writable", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    const workspace = await seedWorkspace({ pricePerHour: "50000.00" });
    const booking = await seedBooking({
      workspaceId: workspace.id,
      bookingDate: FUTURE_DATE,
      startTime: "09:00",
      endTime: "12:00",
      unitPrice: 50000,
    });

    const res = await request(app)
      .patch(`/api/v1/admin/bookings/${booking.id}`)
      .set("Cookie", cookie)
      .send({ startTime: "09:00", endTime: "11:00", totalAmount: "1.00" });

    expect(res.status).toBe(200);
    expect(res.body.totalAmount).not.toBe("1.00");
    expect(res.body.durationHours).toBe("2.00");
    expect(res.body.subtotalAmount).toBe("100000.00");
  });

  it("PATCH /admin/bookings/:id returns 409 BOOKING_SLOT_TAKEN for an overlapping move", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    const workspace = await seedWorkspace();
    await seedBooking({
      workspaceId: workspace.id,
      bookingDate: FUTURE_DATE,
      startTime: "14:00",
      endTime: "16:00",
    });
    const movable = await seedBooking({
      workspaceId: workspace.id,
      bookingDate: FUTURE_DATE,
      startTime: "09:00",
      endTime: "10:00",
    });

    const res = await request(app)
      .patch(`/api/v1/admin/bookings/${movable.id}`)
      .set("Cookie", cookie)
      .send({ startTime: "14:30", endTime: "15:30" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("BOOKING_SLOT_TAKEN");
  });

  it("DELETE /admin/bookings/:id is admin-only and hard-deletes", async () => {
    const { cookie: staffCookie } = await createUserAndSignIn({ role: "staff" });
    const { cookie: adminCookie } = await createUserAndSignIn({ role: "admin" });
    const booking = await seedBooking({ bookingDate: FUTURE_DATE });

    const asStaff = await request(app)
      .delete(`/api/v1/admin/bookings/${booking.id}`)
      .set("Cookie", staffCookie);
    expect(asStaff.status).toBe(403);

    const asAdmin = await request(app)
      .delete(`/api/v1/admin/bookings/${booking.id}`)
      .set("Cookie", adminCookie);
    expect(asAdmin.status).toBe(200);

    const gone = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(gone).toBeNull();
  });

  it("GET /admin/bookings/calendar is not shadowed by the :id route, and caps the range at 92 days", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    const workspace = await seedWorkspace();
    const booking = await seedBooking({
      workspaceId: workspace.id,
      bookingDate: FUTURE_DATE,
      startTime: "09:00",
      endTime: "12:00",
    });

    const ok = await request(app)
      .get(`/api/v1/admin/bookings/calendar?from=${FUTURE_DATE}&to=${FUTURE_DATE}`)
      .set("Cookie", cookie);
    expect(ok.status).toBe(200);
    expect(ok.body.data.map((entry) => entry.id)).toContain(booking.id);
    expect(ok.body.data[0]).not.toHaveProperty("customerId");

    const tooWide = await request(app)
      .get("/api/v1/admin/bookings/calendar?from=2026-01-01&to=2026-06-01")
      .set("Cookie", cookie);
    expect(tooWide.status).toBe(422);
  });
});

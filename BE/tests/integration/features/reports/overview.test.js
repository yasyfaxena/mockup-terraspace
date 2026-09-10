import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../../../src/app.js";
import { seedBooking } from "../../../factories/booking.factory.js";
import { seedLocation } from "../../../factories/location.factory.js";
import { seedWorkspace } from "../../../factories/workspace.factory.js";
import { createUserAndSignIn } from "../../../helpers/auth.js";

const DATE = "2026-08-15";

describe("GET /admin/reports/overview (reports.md §1)", () => {
  it("summarizes today's bookings, split by status, and counts only paid revenue", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    const location = await seedLocation();
    const workspace = await seedWorkspace({ locationId: location.id });
    await seedBooking({
      workspaceId: workspace.id,
      bookingDate: DATE,
      status: "confirmed",
      paymentStatus: "paid",
    });
    await seedBooking({
      workspaceId: workspace.id,
      bookingDate: DATE,
      startTime: "13:00",
      endTime: "14:00",
      status: "cancelled",
      cancelledAt: new Date(),
    });

    const res = await request(app)
      .get(`/api/v1/admin/reports/overview?date=${DATE}&locationId=${location.id}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.summary.bookingsToday).toBe(2);
    expect(res.body.summary.confirmedToday).toBe(1);
    expect(res.body.summary.cancelledToday).toBe(1);
    expect(res.body.summary.revenueToday).toBe("166500.00");
  });

  it("schedule is ordered by startTime and includes customer/workspace names", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    const location = await seedLocation();
    const workspace = await seedWorkspace({ locationId: location.id, name: "Room Z" });
    await seedBooking({
      workspaceId: workspace.id,
      bookingDate: DATE,
      startTime: "14:00",
      endTime: "15:00",
    });
    await seedBooking({
      workspaceId: workspace.id,
      bookingDate: DATE,
      startTime: "09:00",
      endTime: "10:00",
    });

    const res = await request(app)
      .get(`/api/v1/admin/reports/overview?date=${DATE}&locationId=${location.id}`)
      .set("Cookie", cookie);

    expect(res.body.schedule).toHaveLength(2);
    expect(res.body.schedule[0].startTime).toBe("09:00");
    expect(res.body.schedule[1].startTime).toBe("14:00");
    expect(res.body.schedule[0].workspaceName).toBe("Room Z");
  });

  it("accepts staff, not just admin (reports.md §1 access)", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    const res = await request(app)
      .get(`/api/v1/admin/reports/overview?date=${DATE}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
  });

  it("returns 401 without a session", async () => {
    const res = await request(app).get(`/api/v1/admin/reports/overview?date=${DATE}`);
    expect(res.status).toBe(401);
  });

  it("defaults `date` to today when omitted", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    const res = await request(app).get(`/api/v1/admin/reports/overview`).set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

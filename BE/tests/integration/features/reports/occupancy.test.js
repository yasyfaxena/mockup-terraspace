import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../../../src/app.js";
import { seedBooking } from "../../../factories/booking.factory.js";
import { seedLocation } from "../../../factories/location.factory.js";
import { seedWorkspace } from "../../../factories/workspace.factory.js";
import { createUserAndSignIn } from "../../../helpers/auth.js";

const FROM = "2026-08-15";
const TO = "2026-08-15";

describe("GET /admin/reports/occupancy (reports.md §3)", () => {
  it("excludes disabled/maintenance workspaces from availableHours", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const location = await seedLocation();
    await seedWorkspace({ locationId: location.id, availability: "available" });
    await seedWorkspace({ locationId: location.id, availability: "disabled" });
    await seedWorkspace({ locationId: location.id, availability: "maintenance" });

    const res = await request(app)
      .get(`/api/v1/admin/reports/occupancy?from=${FROM}&to=${TO}&locationId=${location.id}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    // one bookable workspace, 09:00-22:00 = 13h open, single day
    expect(res.body.totals.availableHours).toBe("13.00");
  });

  it("computes bookedHours from non-cancelled bookings in range", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const location = await seedLocation();
    const workspace = await seedWorkspace({ locationId: location.id });
    await seedBooking({
      workspaceId: workspace.id,
      bookingDate: FROM,
      startTime: "09:00",
      endTime: "12:00",
    });
    await seedBooking({
      workspaceId: workspace.id,
      bookingDate: FROM,
      startTime: "13:00",
      endTime: "14:00",
      status: "cancelled",
      cancelledAt: new Date(),
    });

    const res = await request(app)
      .get(`/api/v1/admin/reports/occupancy?from=${FROM}&to=${TO}&locationId=${location.id}`)
      .set("Cookie", cookie);

    expect(res.body.totals.bookedHours).toBe("3.00");
  });

  it("byWorkspace and leastUtilized identify the lowest occupancy workspace", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const location = await seedLocation();
    const busy = await seedWorkspace({ locationId: location.id, name: "Busy Room" });
    const quiet = await seedWorkspace({ locationId: location.id, name: "Quiet Room" });
    await seedBooking({
      workspaceId: busy.id,
      bookingDate: FROM,
      startTime: "09:00",
      endTime: "20:00",
    });
    await seedBooking({
      workspaceId: quiet.id,
      bookingDate: FROM,
      startTime: "09:00",
      endTime: "10:00",
    });

    const res = await request(app)
      .get(`/api/v1/admin/reports/occupancy?from=${FROM}&to=${TO}&locationId=${location.id}`)
      .set("Cookie", cookie);

    expect(res.body.byWorkspace).toHaveLength(2);
    expect(res.body.leastUtilized[0].workspaceName).toBe("Quiet Room");
  });

  it("rejects a range over 366 days (422)", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const res = await request(app)
      .get(`/api/v1/admin/reports/occupancy?from=2025-01-01&to=2026-06-01`)
      .set("Cookie", cookie);
    expect(res.status).toBe(422);
  });

  it("returns 403 for staff", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    const res = await request(app)
      .get(`/api/v1/admin/reports/occupancy?from=${FROM}&to=${TO}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(403);
  });
});

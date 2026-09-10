import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../../../src/app.js";
import { seedBooking } from "../../../factories/booking.factory.js";
import { seedPayment } from "../../../factories/payment.factory.js";
import { createUserAndSignIn } from "../../../helpers/auth.js";

describe("GET /admin/activity (reports.md §5)", () => {
  it("includes a booking_created entry for a newly seeded booking", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    const booking = await seedBooking();

    const res = await request(app).get("/api/v1/admin/activity").set("Cookie", cookie);

    expect(res.status).toBe(200);
    const entry = res.body.data.find(
      (event) => event.type === "booking_created" && event.subject.id === booking.id,
    );
    expect(entry).toBeTruthy();
    expect(entry.subject.reference).toBe(booking.reference);
  });

  it("includes a payment_succeeded entry for a paid payment", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    await seedPayment({ status: "paid", paidAt: new Date() });

    const res = await request(app).get("/api/v1/admin/activity").set("Cookie", cookie);

    expect(res.body.data.some((event) => event.type === "payment_succeeded")).toBe(true);
  });

  it("filters by type", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    await seedBooking();
    await seedPayment({ status: "paid", paidAt: new Date() });

    const res = await request(app)
      .get("/api/v1/admin/activity?type=payment_succeeded")
      .set("Cookie", cookie);

    expect(res.body.data.every((event) => event.type === "payment_succeeded")).toBe(true);
  });

  it("caps limit at 50", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    const res = await request(app).get("/api/v1/admin/activity?limit=999").set("Cookie", cookie);
    expect(res.status).toBe(422);
  });

  it("returns 403 for a customer", async () => {
    const { cookie } = await createUserAndSignIn({ role: "customer" });
    const res = await request(app).get("/api/v1/admin/activity").set("Cookie", cookie);
    expect(res.status).toBe(403);
  });
});

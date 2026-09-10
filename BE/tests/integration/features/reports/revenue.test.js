import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../../../src/app.js";
import { seedBooking } from "../../../factories/booking.factory.js";
import { seedPayment, seedRefund } from "../../../factories/payment.factory.js";
import { seedLocation } from "../../../factories/location.factory.js";
import { seedWorkspace } from "../../../factories/workspace.factory.js";
import { createUserAndSignIn } from "../../../helpers/auth.js";

const FROM = "2026-08-01";
const TO = "2026-08-31";

describe("GET /admin/reports/revenue (reports.md §2)", () => {
  it("counts only paymentStatus=paid bookings toward revenue (rule 1)", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    await seedBooking({
      bookingDate: "2026-08-15",
      unitPrice: 50000,
      taxPercent: 11,
      paymentStatus: "paid",
    });
    await seedBooking({
      bookingDate: "2026-08-15",
      unitPrice: 50000,
      taxPercent: 11,
      paymentStatus: "pending",
    });

    const res = await request(app)
      .get(`/api/v1/admin/reports/revenue?from=${FROM}&to=${TO}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.totals.bookingCount).toBe(1);
    expect(res.body.totals.grossRevenue).toBe("166500.00");
  });

  it("netRevenue subtracts succeeded refunds (rule 2/3)", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const booking = await seedBooking({
      bookingDate: "2026-08-15",
      startTime: "09:00",
      endTime: "10:00",
      unitPrice: 100000,
      taxPercent: 0,
      paymentStatus: "paid",
      currency: "IDR",
    });
    const payment = await seedPayment({
      bookingId: booking.id,
      status: "paid",
      currency: "IDR",
      amountMinor: 100000n,
    });
    await seedRefund({ paymentId: payment.id, amountMinor: 30000n });

    const res = await request(app)
      .get(`/api/v1/admin/reports/revenue?from=${FROM}&to=${TO}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.totals.grossRevenue).toBe("100000.00");
    expect(res.body.totals.refundedAmount).toBe("30000.00");
    expect(res.body.totals.netRevenue).toBe("70000.00");
  });

  it("a refund on an unsucceeded status is never subtracted", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const booking = await seedBooking({
      bookingDate: "2026-08-15",
      startTime: "09:00",
      endTime: "10:00",
      unitPrice: 100000,
      taxPercent: 0,
      paymentStatus: "paid",
    });
    const payment = await seedPayment({
      bookingId: booking.id,
      status: "paid",
      amountMinor: 100000n,
    });
    await seedRefund({ paymentId: payment.id, amountMinor: 30000n, status: "failed" });

    const res = await request(app)
      .get(`/api/v1/admin/reports/revenue?from=${FROM}&to=${TO}`)
      .set("Cookie", cookie);

    expect(res.body.totals.refundedAmount).toBe("0.00");
    expect(res.body.totals.netRevenue).toBe("100000.00");
  });

  it("cancelled bookings count toward cancellationRate but not revenue (rule 6)", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    await seedBooking({ bookingDate: "2026-08-15", paymentStatus: "paid" });
    await seedBooking({
      bookingDate: "2026-08-15",
      status: "cancelled",
      paymentStatus: "pending",
      cancelledAt: new Date(),
    });

    const res = await request(app)
      .get(`/api/v1/admin/reports/revenue?from=${FROM}&to=${TO}`)
      .set("Cookie", cookie);

    expect(res.body.totals.bookingCount).toBe(1);
    expect(res.body.totals.cancellationRate).toBe(50);
  });

  it("bookings in different currencies split into byCurrency, never summed (rule 4)", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    await seedBooking({ bookingDate: "2026-08-15", paymentStatus: "paid", currency: "IDR" });
    await seedBooking({ bookingDate: "2026-08-15", paymentStatus: "paid", currency: "USD" });

    const res = await request(app)
      .get(`/api/v1/admin/reports/revenue?from=${FROM}&to=${TO}`)
      .set("Cookie", cookie);

    expect(res.body.currency).toBeUndefined();
    expect(res.body.byCurrency).toHaveLength(2);
  });

  it("rows outside the requested range are excluded", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    await seedBooking({ bookingDate: "2026-08-15", paymentStatus: "paid" });
    await seedBooking({ bookingDate: "2026-09-15", paymentStatus: "paid" });

    const res = await request(app)
      .get(`/api/v1/admin/reports/revenue?from=${FROM}&to=${TO}`)
      .set("Cookie", cookie);

    expect(res.body.totals.bookingCount).toBe(1);
  });

  it("filters by locationId", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const locationA = await seedLocation();
    const locationB = await seedLocation();
    const workspaceA = await seedWorkspace({ locationId: locationA.id });
    const workspaceB = await seedWorkspace({ locationId: locationB.id });
    await seedBooking({
      bookingDate: "2026-08-15",
      workspaceId: workspaceA.id,
      paymentStatus: "paid",
    });
    await seedBooking({
      bookingDate: "2026-08-15",
      workspaceId: workspaceB.id,
      paymentStatus: "paid",
    });

    const res = await request(app)
      .get(`/api/v1/admin/reports/revenue?from=${FROM}&to=${TO}&locationId=${locationA.id}`)
      .set("Cookie", cookie);

    expect(res.body.totals.bookingCount).toBe(1);
    expect(res.body.byLocation).toEqual([
      expect.objectContaining({ locationId: locationA.id, bookingCount: 1 }),
    ]);
  });

  it("rejects a range over 366 days (422)", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const res = await request(app)
      .get(`/api/v1/admin/reports/revenue?from=2025-01-01&to=2026-06-01`)
      .set("Cookie", cookie);
    expect(res.status).toBe(422);
  });

  it("rejects to < from (422)", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const res = await request(app)
      .get(`/api/v1/admin/reports/revenue?from=${TO}&to=${FROM}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(422);
  });

  it("returns 403 for staff — admin only", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    const res = await request(app)
      .get(`/api/v1/admin/reports/revenue?from=${FROM}&to=${TO}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(403);
  });

  it("returns 401 without a session", async () => {
    const res = await request(app).get(`/api/v1/admin/reports/revenue?from=${FROM}&to=${TO}`);
    expect(res.status).toBe(401);
  });
});

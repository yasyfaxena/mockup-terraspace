import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../../../src/app.js";
import { seedPayment } from "../../../factories/payment.factory.js";
import { createUserAndSignIn } from "../../../helpers/auth.js";

describe("GET /admin/payments (payments.md §9)", () => {
  it("lists payments with pagination and a refundedAmount derived from succeeded refunds", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    await seedPayment({ status: "paid" });
    await seedPayment({ status: "pending" });

    const res = await request(app).get("/api/v1/admin/payments").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20, total: 2 });
    expect(res.body.data[0]).toHaveProperty("refundedAmount");
    expect(res.body.data[0]).toHaveProperty("booking");
    expect(res.body.data[0]).toHaveProperty("customer");
  });

  it("filters by status", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    await seedPayment({ status: "paid" });
    await seedPayment({ status: "pending" });

    const res = await request(app).get("/api/v1/admin/payments?status=paid").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe("paid");
  });

  it("returns 403 for a non-admin", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    const res = await request(app).get("/api/v1/admin/payments").set("Cookie", cookie);
    expect(res.status).toBe(403);
  });
});

describe("GET /admin/payments/:id (payments.md §10)", () => {
  it("returns the full record with refunds and events, never exposing signature/rawBody", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const payment = await seedPayment({ status: "paid" });

    const res = await request(app)
      .get(`/api/v1/admin/payments/${payment.id}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(payment.id);
    expect(res.body.refunds).toEqual([]);
    expect(res.body.events).toEqual([]);
    expect(res.body).not.toHaveProperty("signature");
    expect(res.body).not.toHaveProperty("rawBody");
  });

  it("returns 404 for an unknown payment", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const res = await request(app)
      .get("/api/v1/admin/payments/00000000-0000-0000-0000-000000000000")
      .set("Cookie", cookie);
    expect(res.status).toBe(404);
  });
});

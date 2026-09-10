import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../../../src/app.js";
import { seedPayment, seedRefund } from "../../../factories/payment.factory.js";
import { createUserAndSignIn } from "../../../helpers/auth.js";

describe("GET /admin/reports/payments (reports.md §4)", () => {
  it("totals cover the whole filtered set, not just the current page", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    await seedPayment({ status: "paid", amountMinor: 100000n });
    await seedPayment({ status: "paid", amountMinor: 200000n });
    await seedPayment({ status: "pending", amountMinor: 50000n });

    const res = await request(app)
      .get("/api/v1/admin/reports/payments?limit=1")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.totals.paid).toBe("300000.00");
    expect(res.body.totals.pending).toBe("50000.00");
  });

  it("netAmount reflects a succeeded refund", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const payment = await seedPayment({ status: "partially_refunded", amountMinor: 100000n });
    await seedRefund({ paymentId: payment.id, amountMinor: 40000n });

    const res = await request(app).get("/api/v1/admin/reports/payments").set("Cookie", cookie);

    const row = res.body.data.find((entry) => entry.paymentId === payment.id);
    expect(row.amount).toBe("100000.00");
    expect(row.refundedAmount).toBe("40000.00");
    expect(row.netAmount).toBe("60000.00");
  });

  it("filters by status", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    await seedPayment({ status: "paid" });
    await seedPayment({ status: "failed" });

    const res = await request(app)
      .get("/api/v1/admin/reports/payments?status=failed")
      .set("Cookie", cookie);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].status).toBe("failed");
  });

  it("returns 403 for staff — admin only", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    const res = await request(app).get("/api/v1/admin/reports/payments").set("Cookie", cookie);
    expect(res.status).toBe(403);
  });
});

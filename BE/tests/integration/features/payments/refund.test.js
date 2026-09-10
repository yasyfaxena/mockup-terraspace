import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../../../src/app.js";
import { prisma } from "../../../../src/shared/database/client.js";
import { seedPayment } from "../../../factories/payment.factory.js";
import { createUserAndSignIn } from "../../../helpers/auth.js";
import { mockRefund } from "../../../helpers/paybridge.js";

describe("POST /admin/payments/:id/refund (payments.md §11)", () => {
  it("defaults to the full unrefunded remainder and marks the payment refunded", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const payment = await seedPayment({ status: "paid", amountMinor: 100000n });
    mockRefund({ amount: 100000 });

    const res = await request(app)
      .post(`/api/v1/admin/payments/${payment.id}/refund`)
      .set("Cookie", cookie)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe("100000.00");
    expect(res.body.payment.status).toBe("refunded");
    expect(res.body.payment.remainingAmount).toBe("0.00");

    const persisted = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(persisted.status).toBe("refunded");
  });

  it("a partial amount sets the payment partially_refunded", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const payment = await seedPayment({ status: "paid", amountMinor: 100000n });
    mockRefund({ amount: 40000 });

    const res = await request(app)
      .post(`/api/v1/admin/payments/${payment.id}/refund`)
      .set("Cookie", cookie)
      .send({ amount: "40000.00", reason: "Customer requested partial refund" });

    expect(res.status).toBe(201);
    expect(res.body.payment.status).toBe("partially_refunded");
    expect(res.body.payment.refundedAmount).toBe("40000.00");
    expect(res.body.payment.remainingAmount).toBe("60000.00");

    const persisted = await prisma.payment.findUnique({ where: { id: payment.id } });
    expect(persisted.status).toBe("partially_refunded");
  });

  it("records requestedBy as the acting admin — the audit trail for money leaving the business", async () => {
    const { cookie, user } = await createUserAndSignIn({ role: "admin" });
    const payment = await seedPayment({ status: "paid", amountMinor: 100000n });
    mockRefund({ amount: 100000 });

    await request(app)
      .post(`/api/v1/admin/payments/${payment.id}/refund`)
      .set("Cookie", cookie)
      .send({});

    const refund = await prisma.refund.findFirst({ where: { paymentId: payment.id } });
    expect(refund.requestedBy).toBe(user.id);
  });

  it("returns 404 for an unknown payment", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });

    const res = await request(app)
      .post(`/api/v1/admin/payments/00000000-0000-0000-0000-000000000000/refund`)
      .set("Cookie", cookie)
      .send({});

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 409 PAYMENT_NOT_REFUNDABLE for a payment that isn't paid", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const payment = await seedPayment({ status: "pending" });

    const res = await request(app)
      .post(`/api/v1/admin/payments/${payment.id}/refund`)
      .set("Cookie", cookie)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("PAYMENT_NOT_REFUNDABLE");
  });

  it("returns 422 REFUND_EXCEEDS_REMAINDER above the unrefunded balance", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const payment = await seedPayment({ status: "paid", amountMinor: 100000n });

    const res = await request(app)
      .post(`/api/v1/admin/payments/${payment.id}/refund`)
      .set("Cookie", cookie)
      .send({ amount: "150000.00" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("REFUND_EXCEEDS_REMAINDER");
  });

  it("returns 401 without a session", async () => {
    const payment = await seedPayment({ status: "paid" });
    const res = await request(app).post(`/api/v1/admin/payments/${payment.id}/refund`).send({});
    expect(res.status).toBe(401);
  });

  it("returns 403 for a customer — refunds are admin only, not staff (payments.md §11)", async () => {
    const { cookie } = await createUserAndSignIn({ role: "customer" });
    const payment = await seedPayment({ status: "paid" });

    const res = await request(app)
      .post(`/api/v1/admin/payments/${payment.id}/refund`)
      .set("Cookie", cookie)
      .send({});

    expect(res.status).toBe(403);
  });

  it("returns 403 for staff — money moves are admin only", async () => {
    const { cookie } = await createUserAndSignIn({ role: "staff" });
    const payment = await seedPayment({ status: "paid" });

    const res = await request(app)
      .post(`/api/v1/admin/payments/${payment.id}/refund`)
      .set("Cookie", cookie)
      .send({});

    expect(res.status).toBe(403);
  });
});

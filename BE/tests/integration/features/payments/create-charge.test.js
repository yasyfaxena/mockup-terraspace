import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../../../src/app.js";
import { prisma } from "../../../../src/shared/database/client.js";
import { seedBooking } from "../../../factories/booking.factory.js";
import { seedPayment } from "../../../factories/payment.factory.js";
import { createUserAndSignIn } from "../../../helpers/auth.js";
import { mockCharge } from "../../../helpers/paybridge.js";

const PHONE = "+628110000000";

/** A signed-in customer with a phone on file — PayBridge requires one (payments.md §6 rule 1). */
async function customerWithPhone() {
  const { cookie, user } = await createUserAndSignIn();
  await prisma.user.update({ where: { id: user.id }, data: { phone: PHONE } });
  return { cookie, user };
}

describe("POST /bookings/:id/payments (payments.md §6)", () => {
  it("creates a charge, persists the payment row before responding, and returns checkoutUrl", async () => {
    const { cookie, user } = await customerWithPhone();
    const booking = await seedBooking({ userId: user.id, unitPrice: 50000, taxPercent: 11 });
    mockCharge();

    const res = await request(app)
      .post(`/api/v1/bookings/${booking.id}/payments`)
      .set("Cookie", cookie)
      .send({ provider: "xendit" });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("pending");
    expect(res.body.provider).toBe("xendit");
    expect(res.body.currency).toBe("IDR");
    expect(res.body.checkoutUrl).toBe("https://pay.test/checkout/sess_1");
    expect(res.body.booking).toEqual({
      id: booking.id,
      reference: booking.reference,
      status: "pending",
    });

    const persisted = await prisma.payment.findUnique({ where: { id: res.body.paymentId } });
    expect(persisted).not.toBeNull();
    expect(persisted.paybridgeOrderId).toBe("TSPC-1-3-18cf2a91b3c");
    expect(persisted.status).toBe("pending");
  });

  it("computes amountMinor from the booking's own snapshot — IDR exponent 0, never x100 (REG-010-adjacent)", async () => {
    const { cookie, user } = await customerWithPhone();
    const booking = await seedBooking({ userId: user.id, unitPrice: 50000, taxPercent: 11 });
    mockCharge();

    const res = await request(app)
      .post(`/api/v1/bookings/${booking.id}/payments`)
      .set("Cookie", cookie)
      .send({ provider: "xendit" });

    expect(res.status).toBe(201);
    expect(res.body.amountMinor).toBe(166500);
    expect(res.body.amount).toBe("166500.00");
  });

  it("ignores a hostile body — amount is always read from the booking, never the request", async () => {
    const { cookie, user } = await customerWithPhone();
    const booking = await seedBooking({ userId: user.id, unitPrice: 50000, taxPercent: 11 });
    mockCharge();

    const res = await request(app)
      .post(`/api/v1/bookings/${booking.id}/payments`)
      .set("Cookie", cookie)
      .send({ provider: "xendit", amount: 1, amountMinor: 1 });

    expect(res.status).toBe(201);
    expect(res.body.amountMinor).toBe(166500);
  });

  it("returns 401 without a session", async () => {
    const booking = await seedBooking();
    const res = await request(app).post(`/api/v1/bookings/${booking.id}/payments`).send({});
    expect(res.status).toBe(401);
  });

  it("returns 404 for another user's booking", async () => {
    const { cookie } = await customerWithPhone();
    const booking = await seedBooking();

    const res = await request(app)
      .post(`/api/v1/bookings/${booking.id}/payments`)
      .set("Cookie", cookie)
      .send({ provider: "xendit" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 422 PAYMENT_CUSTOMER_INCOMPLETE when the user has no phone", async () => {
    const { cookie, user } = await createUserAndSignIn();
    const booking = await seedBooking({ userId: user.id });

    const res = await request(app)
      .post(`/api/v1/bookings/${booking.id}/payments`)
      .set("Cookie", cookie)
      .send({ provider: "xendit" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("PAYMENT_CUSTOMER_INCOMPLETE");
  });

  it("returns 409 BOOKING_ALREADY_CANCELLED for a cancelled booking", async () => {
    const { cookie, user } = await customerWithPhone();
    const booking = await seedBooking({
      userId: user.id,
      status: "cancelled",
      cancelledAt: new Date(),
    });

    const res = await request(app)
      .post(`/api/v1/bookings/${booking.id}/payments`)
      .set("Cookie", cookie)
      .send({ provider: "xendit" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("BOOKING_ALREADY_CANCELLED");
  });

  it("returns 409 PAYMENT_ALREADY_PAID when the booking already has a paid payment", async () => {
    const { cookie, user } = await customerWithPhone();
    const booking = await seedBooking({ userId: user.id });
    await seedPayment({ bookingId: booking.id, status: "paid" });

    const res = await request(app)
      .post(`/api/v1/bookings/${booking.id}/payments`)
      .set("Cookie", cookie)
      .send({ provider: "xendit" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("PAYMENT_ALREADY_PAID");
  });

  it("returns 409 PAYMENT_ALREADY_PENDING when a checkout session is already live", async () => {
    const { cookie, user } = await customerWithPhone();
    const booking = await seedBooking({ userId: user.id });
    await seedPayment({ bookingId: booking.id, status: "awaiting_payment" });

    const res = await request(app)
      .post(`/api/v1/bookings/${booking.id}/payments`)
      .set("Cookie", cookie)
      .send({ provider: "xendit" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("PAYMENT_ALREADY_PENDING");
  });
});

describe("GET /bookings/:reference/payment (payments.md §8)", () => {
  it("returns the latest payment for the booking", async () => {
    const { cookie, user } = await customerWithPhone();
    const booking = await seedBooking({ userId: user.id });
    await seedPayment({ bookingId: booking.id, status: "paid", paidAt: new Date() });

    const res = await request(app)
      .get(`/api/v1/bookings/${booking.reference}/payment`)
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("paid");
    expect(res.body.booking).toEqual({ reference: booking.reference, status: booking.status });
  });

  it("returns 404 for another user's booking, never 403", async () => {
    const { cookie } = await customerWithPhone();
    const booking = await seedBooking();

    const res = await request(app)
      .get(`/api/v1/bookings/${booking.reference}/payment`)
      .set("Cookie", cookie);

    expect(res.status).toBe(404);
  });

  it("returns 404 when no payment has been created yet", async () => {
    const { cookie, user } = await customerWithPhone();
    const booking = await seedBooking({ userId: user.id });

    const res = await request(app)
      .get(`/api/v1/bookings/${booking.reference}/payment`)
      .set("Cookie", cookie);

    expect(res.status).toBe(404);
  });
});

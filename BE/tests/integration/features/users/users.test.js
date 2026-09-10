import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../../../src/app.js";
import { createUserAndSignIn } from "../../../helpers/auth.js";
import { seedBooking } from "../../../factories/booking.factory.js";

describe("GET/PATCH /me (users.md §1–2)", () => {
  it("returns the caller's own profile, never another user's", async () => {
    const { cookie, user } = await createUserAndSignIn({ role: "customer" });
    const res = await request(app).get("/api/v1/me").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user.id);
    expect(res.body.stats).toMatchObject({ totalBookings: 0, currency: "IDR" });
    expect(res.body).not.toHaveProperty("password");
    expect(res.body).not.toHaveProperty("accounts");
  });

  it("updates only the allow-listed fields, ignoring role", async () => {
    const { cookie, user } = await createUserAndSignIn({ role: "customer" });

    const res = await request(app)
      .patch("/api/v1/me")
      .set("Cookie", cookie)
      .send({ name: "Updated Name", phone: "0123456789", role: "admin" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Name");
    expect(res.body.role).toBe("customer"); // unaffected by the hostile "role" field

    const adminCheck = await request(app)
      .get(`/api/v1/admin/users/${user.id}`)
      .set("Cookie", (await createUserAndSignIn({ role: "admin" })).cookie);
    expect(adminCheck.body.role).toBe("customer");
  });
});

describe("Admin user management (users.md §3–8)", () => {
  it("creates a user through Better Auth's admin API, verified immediately", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });

    const res = await request(app)
      .post("/api/v1/admin/users")
      .set("Cookie", cookie)
      .send({
        email: `created-${Date.now()}@example.test`,
        password: "password123",
        name: "Created User",
        role: "staff",
        sendWelcomeEmail: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe("staff");
    expect(res.body.emailVerified).toBe(true);
    expect(res.body).not.toHaveProperty("password");
  });

  it("rejects creating a user with a duplicate email", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const email = `dupe-${Date.now()}@example.test`;
    const payload = { email, password: "password123", name: "Dupe", sendWelcomeEmail: false };

    const first = await request(app)
      .post("/api/v1/admin/users")
      .set("Cookie", cookie)
      .send(payload);
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/v1/admin/users")
      .set("Cookie", cookie)
      .send(payload);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
  });

  it("refuses to demote the last remaining admin", async () => {
    const { cookie, user } = await createUserAndSignIn({ role: "admin" });

    const res = await request(app)
      .patch(`/api/v1/admin/users/${user.id}`)
      .set("Cookie", cookie)
      .send({ role: "customer" });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/last remaining admin/i);
  });

  it("demotes an admin when another admin remains", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const { user: secondAdmin } = await createUserAndSignIn({ role: "admin" });

    const res = await request(app)
      .patch(`/api/v1/admin/users/${secondAdmin.id}`)
      .set("Cookie", cookie)
      .send({ role: "customer" });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe("customer");
  });

  it("returns 409 for deleting a user with bookings, and lets ban stand in", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const { user: customer } = await createUserAndSignIn({ role: "customer" });
    await seedBooking({ userId: customer.id });

    const deleteRes = await request(app)
      .delete(`/api/v1/admin/users/${customer.id}`)
      .set("Cookie", cookie);
    expect(deleteRes.status).toBe(409);

    const banRes = await request(app)
      .post(`/api/v1/admin/users/${customer.id}/ban`)
      .set("Cookie", cookie)
      .send({ reason: "Repeated no-shows" });
    expect(banRes.status).toBe(200);
    expect(banRes.body.banned).toBe(true);

    const unbanRes = await request(app)
      .post(`/api/v1/admin/users/${customer.id}/unban`)
      .set("Cookie", cookie);
    expect(unbanRes.status).toBe(200);
    expect(unbanRes.body.banned).toBe(false);
  });

  it("deletes a user with no bookings", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const { user: customer } = await createUserAndSignIn({ role: "customer" });

    const res = await request(app)
      .delete(`/api/v1/admin/users/${customer.id}`)
      .set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("refuses to delete or ban yourself", async () => {
    const { cookie, user } = await createUserAndSignIn({ role: "admin" });

    const deleteRes = await request(app)
      .delete(`/api/v1/admin/users/${user.id}`)
      .set("Cookie", cookie);
    expect(deleteRes.status).toBe(422);

    const banRes = await request(app)
      .post(`/api/v1/admin/users/${user.id}/ban`)
      .set("Cookie", cookie)
      .send({ reason: "test" });
    expect(banRes.status).toBe(422);
  });

  it("lists users with SQL-computed pagination metadata", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const res = await request(app).get("/api/v1/admin/users?limit=5&page=1").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 5 });
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

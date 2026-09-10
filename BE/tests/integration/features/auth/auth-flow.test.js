import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../../../src/app.js";
import { prisma } from "../../../../src/shared/database/client.js";
import { signUpVerifiedCustomer, createUserAndSignIn } from "../../../helpers/auth.js";

describe("sign up → verify → sign in (features/auth.md)", () => {
  it("issues no session at sign-up, then a real one after verifying", async () => {
    const { signUpUser, verifyStatus, cookie } = await signUpVerifiedCustomer();

    // REG-003 — every sign-up is a customer, never admin, regardless of user count.
    expect(signUpUser.role).toBe("customer");
    expect(signUpUser.emailVerified).toBe(false);

    expect(verifyStatus).toBe(302);
    expect(cookie).toMatch(/^better-auth\.session_token=/);
  });

  it("password never appears on the users table — only on accounts", async () => {
    const { signUpUser } = await signUpVerifiedCustomer();

    const user = await prisma.user.findUniqueOrThrow({ where: { id: signUpUser.id } });
    expect(user).not.toHaveProperty("password");

    const account = await prisma.account.findFirstOrThrow({ where: { userId: signUpUser.id } });
    expect(account.password).toBeTruthy();
    expect(account.providerId).toBe("credential");
  });
});

describe("requireRole (features/auth.md)", () => {
  it("returns 401 for an anonymous request", async () => {
    const res = await request(app).get("/api/v1/admin/users");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 403 for an authenticated customer", async () => {
    const { cookie } = await createUserAndSignIn({ role: "customer" });
    const res = await request(app).get("/api/v1/admin/users").set("Cookie", cookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("allows an authenticated admin through", async () => {
    const { cookie } = await createUserAndSignIn({ role: "admin" });
    const res = await request(app).get("/api/v1/admin/users").set("Cookie", cookie);
    expect(res.status).toBe(200);
  });
});

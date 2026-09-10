import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import request from "supertest";
import { vi } from "vitest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/shared/database/client.js";
import * as mailer from "../../src/shared/lib/mailer.js";

const DEFAULT_PASSWORD = "password123";

/** Pulls the first `href` out of a rendered email's HTML. */
function extractUrlFromHtml(html) {
  const match = html.match(/href="([^"]+)"/);
  if (!match) throw new Error("No href found in the rendered email HTML.");
  return match[1].replace(/&amp;/g, "&");
}

/**
 * Creates a user directly (bypassing Better Auth's own signup — no
 * verification round trip needed) with a real `credential` login, then
 * signs in through the real endpoint to get a real session cookie.
 * @param {{ role?: string, email?: string }} [overrides]
 */
export async function createUserAndSignIn(overrides = {}) {
  const role = overrides.role ?? "customer";
  const email = overrides.email ?? `${role}-${randomUUID()}@example.test`;

  const user = await prisma.user.create({
    data: { id: randomUUID(), name: `Test ${role}`, email, emailVerified: true, role },
  });
  await prisma.account.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: await hashPassword(DEFAULT_PASSWORD),
    },
  });

  const signInRes = await request(app)
    .post("/api/auth/sign-in/email")
    .send({ email, password: DEFAULT_PASSWORD });
  const cookie = signInRes.headers["set-cookie"][0];

  return { cookie, user };
}

/**
 * Signs up through the real HTTP endpoint, captures the verification link
 * from the (mocked) outgoing email, follows it, then signs in — exercising
 * the full sign-up → verify → sign-in pipeline end to end.
 * @param {{ email?: string, name?: string }} [overrides]
 */
export async function signUpVerifiedCustomer(overrides = {}) {
  const email = overrides.email ?? `customer-${randomUUID()}@example.test`;
  const name = overrides.name ?? "Test Customer";

  const sendEmailSpy = vi.spyOn(mailer, "sendEmail").mockResolvedValue(undefined);
  try {
    const signUpRes = await request(app)
      .post("/api/auth/sign-up/email")
      .send({ email, password: DEFAULT_PASSWORD, name });

    const call = sendEmailSpy.mock.calls.find(([message]) => message.to === email);
    if (!call) throw new Error("Verification email was never sent.");
    const verifyUrl = extractUrlFromHtml(call[0].html);
    const verifyPath = verifyUrl.replace(/^https?:\/\/[^/]+/, "");

    const verifyRes = await request(app).get(verifyPath);

    const signInRes = await request(app)
      .post("/api/auth/sign-in/email")
      .send({ email, password: DEFAULT_PASSWORD });
    const cookie = signInRes.headers["set-cookie"]?.[0];

    return { cookie, signUpUser: signUpRes.body.user, verifyStatus: verifyRes.status, signInRes };
  } finally {
    sendEmailSpy.mockRestore();
  }
}

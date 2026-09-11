import type { APIRequestContext } from "@playwright/test";

export const BE_URL = process.env["E2E_BE_URL"] ?? "http://localhost:3000";

/**
 * Signs up + signs in a real user against the real BE (never mocked —
 * these are E2E specs). Better Auth's session cookie is host-only, not
 * port-scoped, so once it's in `request`'s cookie jar it's sent to both
 * BE (:3000) and FE (:5173) — the same reason curl-with-a-cookiejar worked
 * across both origins throughout this project's manual verification.
 */
export async function signUpAndSignIn(
  request: APIRequestContext,
  email: string,
  password: string,
  name: string,
) {
  await request.post(`${BE_URL}/api/auth/sign-up/email`, {
    data: { email, password, name },
  });
}

export async function signIn(request: APIRequestContext, email: string, password: string) {
  const res = await request.post(`${BE_URL}/api/auth/sign-in/email`, {
    data: { email, password },
  });
  if (!res.ok()) {
    throw new Error(`sign-in failed: ${res.status()} ${await res.text()}`);
  }
}

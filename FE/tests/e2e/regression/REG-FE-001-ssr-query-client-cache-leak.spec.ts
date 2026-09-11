import { test, expect } from "@playwright/test";
import { BE_URL, signIn, signUpAndSignIn } from "../helpers/auth";
import { deleteTestUser, verifyAndPromote } from "../helpers/db";

/**
 * REG-FE-001 — SSR QueryClient was a module-level singleton
 *
 * Was: `lib/query-client.ts` exported `queryClient` as one instance shared
 *      by every SSR request in the same Node process. `router.tsx`'s
 *      `getRouter()` reused that same instance every time, so once one
 *      request populated a query's cache, every later request in that
 *      process kept serving that first answer — a deleted/created row
 *      would not show up on a later page load until the process restarted.
 *      Discovered on the admin calendar (Phase 5); reproduced here against
 *      `/admin/locations` instead, since it needs no booking/pricing setup
 *      and exercises the exact same `createQueryClient()`-per-request
 *      contract the fix actually lives in.
 * Fix: `createQueryClient()` is called fresh inside `getRouter()` — every
 *      SSR request gets its own cache, so a change made between two page
 *      loads is never masked by the previous load's cached result.
 */

const EMAIL = `reg-fe-001-${Date.now()}@test.local`;
const PASSWORD = "Password123!";
const LOCATION_NAME = `REG-FE-001 Test Location ${Date.now()}`;

let locationId: string | undefined;

test.beforeAll(async ({ request }) => {
  // `beforeAll`'s `request` fixture is worker-scoped, not shared with the
  // test body's `page`/`request` — sign-up alone (no cookie needed yet) is
  // fine here; the actual sign-in that must land in the browser's cookie
  // jar happens inside the test itself, against its own `request`.
  await signUpAndSignIn(request, EMAIL, PASSWORD, "REG FE 001");
  await verifyAndPromote(EMAIL, "admin");
});

test.afterAll(async ({ request }) => {
  // Best-effort: only reached if the test itself failed before cleaning up
  // its own location. This `request` has no session of its own, so sign in
  // again first — a failed delete here shouldn't fail the whole run.
  if (locationId) {
    await signIn(request, EMAIL, PASSWORD).catch(() => undefined);
    await request.delete(`${BE_URL}/api/v1/admin/locations/${locationId}`).catch(() => undefined);
  }
  await deleteTestUser(EMAIL);
});

test("a location deleted between two page loads does not survive as stale SSR cache", async ({
  page,
}) => {
  // `page.request` (not the bare `request` fixture) shares its cookie jar
  // with `page`'s own browser context — the bare fixture is an independent
  // APIRequestContext with no relationship to what the browser sends on
  // navigation, so a sign-in through it never reaches the SSR request that
  // `page.goto()` triggers.
  const api = page.request;
  await signIn(api, EMAIL, PASSWORD);

  const created = await api.post(`${BE_URL}/api/v1/admin/locations`, {
    data: {
      slug: `reg-fe-001-${Date.now()}`,
      name: LOCATION_NAME,
      address: "1 Test Street",
      city: "Testville",
    },
  });
  expect(created.ok()).toBe(true);
  const body = await created.json();
  locationId = body.id;

  // First SSR request: the just-created location must be visible.
  await page.goto("/admin/locations");
  await expect(page.getByText(LOCATION_NAME)).toBeVisible();

  const deleted = await api.delete(`${BE_URL}/api/v1/admin/locations/${locationId}`);
  expect(deleted.ok()).toBe(true);
  locationId = undefined;

  // Second SSR request, same server process: with the singleton bug, this
  // would still show the first request's cached (now-deleted) location.
  await page.goto("/admin/locations");
  await expect(page.getByText(LOCATION_NAME)).not.toBeVisible();
});

import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import type { Role } from "./auth.types";

/** Client-side session hook — Better Auth manages its own cache, not TanStack Query. */
export const useSession = authClient.useSession;

/**
 * `beforeLoad` runs during SSR too, where `authClient.getSession()`'s fetch
 * is a real cross-process HTTP call to BE/ that starts with no cookies of
 * its own — the browser's `Cookie` header has to be forwarded by hand, or
 * every hard-refresh/direct-link load looks signed-out. Client-side
 * navigation doesn't need this: the browser's own fetch already sends its
 * cookies to BE/. `createIsomorphicFn` (not a plain `typeof document` check)
 * because Start's build statically forbids a server-only import
 * (`@tanstack/react-start/server`) reaching a client-bundled module any
 * other way.
 */
const forwardedSessionHeaders = createIsomorphicFn()
  .client(() => ({}) as Record<string, string>)
  .server(() => {
    try {
      const cookie = getRequestHeader("cookie");
      return cookie ? { cookie } : {};
    } catch {
      // No active SSR request to read from (e.g. a unit test importing this
      // module directly, outside a real Start request).
      return {};
    }
  });

/**
 * Route guards for `beforeLoad`. Named without a `use` prefix (unlike
 * frontend-spec.md's `useRequireRole`) on purpose: `beforeLoad` runs outside
 * a component render, and an ESLint hook-naming rule would flag a `use*`
 * identifier called there as a rules-of-hooks violation. Behavior matches
 * the doc: anonymous -> /login, wrong role -> / — never the same redirect
 * for both (mirrors BE error-handling.md §5's 401-vs-403 split).
 */
export async function requireAuth() {
  const headers = await forwardedSessionHeaders();
  const { data } = await authClient.getSession({ fetchOptions: { headers } });
  if (!data?.session) {
    throw redirect({ to: "/login" });
  }
  return data;
}

export async function requireRole(...roles: Role[]) {
  const data = await requireAuth();
  const role = (data.user as { role?: Role }).role;
  if (!role || !roles.includes(role)) {
    throw redirect({ to: "/" });
  }
  return data;
}

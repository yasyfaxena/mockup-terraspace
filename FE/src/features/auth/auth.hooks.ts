import { redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { forwardedRequestHeaders } from "@/shared/forwarded-headers";
import type { Role } from "./auth.types";

/** Client-side session hook — Better Auth manages its own cache, not TanStack Query. */
export const useSession = authClient.useSession;

/**
 * Route guards for `beforeLoad`. Named without a `use` prefix (unlike
 * frontend-spec.md's `useRequireRole`) on purpose: `beforeLoad` runs outside
 * a component render, and an ESLint hook-naming rule would flag a `use*`
 * identifier called there as a rules-of-hooks violation. Behavior matches
 * the doc: anonymous -> /login, wrong role -> / — never the same redirect
 * for both (mirrors BE error-handling.md §5's 401-vs-403 split).
 */
export async function requireAuth() {
  const headers = forwardedRequestHeaders();
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

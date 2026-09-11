import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

/**
 * A route `loader`/`beforeLoad` runs during SSR too, where any fetch to
 * `BE/` is a real cross-process HTTP call that starts with no cookies of
 * its own — the incoming request's `Cookie` header has to be forwarded by
 * hand, or every hard-refresh/direct-link load to an authenticated
 * endpoint looks signed-out (`error.code === "UNAUTHENTICATED"`). Client-
 * side navigation doesn't need this: the browser's own fetch already sends
 * its cookies to `BE/`.
 *
 * `createIsomorphicFn` (not a plain `typeof document` check) because
 * Start's build statically forbids a server-only import
 * (`@tanstack/react-start/server`) reaching a client-bundled module any
 * other way — `lib/api-client.ts` and `features/auth/auth.hooks.ts` are
 * both used client-side too.
 */
export const forwardedRequestHeaders = createIsomorphicFn()
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

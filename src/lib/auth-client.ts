import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

/**
 * The only file that imports Better Auth's client SDK (fe-architecture.md
 * §3's "index.ts is the public surface" rule, one level down). Everything
 * else goes through features/auth's hooks.
 */
export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  plugins: [adminClient()],
});

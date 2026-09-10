import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { prisma } from "../../shared/database/client.js";
import { env } from "../../shared/config/env.js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql", usePlural: true }),

  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: env.TRUSTED_ORIGINS,

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  socialProviders:
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            prompt: "select_account",
          },
        }
      : undefined,

  account: {
    accountLinking: {
      enabled: true,
      // Only Google is trusted here — it verifies the email address it
      // returns. Never add a provider that does not, or account takeover
      // becomes possible (see libraries.md §2.2).
      trustedProviders: ["google"],
    },
  },

  user: {
    additionalFields: {
      phone: { type: "string", required: false },
      company: { type: "string", required: false },
    },
  },

  plugins: [admin({ defaultRole: "customer", adminRoles: ["admin"] })],
});

import { createElement } from "react";
import { render } from "@react-email/render";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { prisma } from "../../shared/database/client.js";
import { env } from "../../shared/config/env.js";
import { sendEmail } from "../../shared/lib/mailer.js";
import { VerificationEmail } from "./emails/verification-email.js";
import { ResetPasswordEmail } from "./emails/reset-password-email.js";

export const auth = betterAuth({
  // `usePlural` governs the *Prisma Client property* Better Auth expects
  // (`prisma.users` vs `prisma.user`) — it has nothing to do with the SQL
  // table name. Our tables are plural via `@@map` (erd-spec.md), but the
  // Prisma models stay singular (`User`, `Session`, ...) by convention, so
  // this must be `false` or Better Auth's own schema check reports every
  // one of them as a missing table.
  database: prismaAdapter(prisma, { provider: "postgresql", usePlural: false }),

  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: env.TRUSTED_ORIGINS,

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      const html = await render(createElement(ResetPasswordEmail, { name: user.name, url }));
      await sendEmail({ to: user.email, subject: "Reset your TerraSpace password", html });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      const html = await render(createElement(VerificationEmail, { name: user.name, url }));
      await sendEmail({ to: user.email, subject: "Verify your TerraSpace email", html });
    },
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

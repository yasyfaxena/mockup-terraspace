import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  TRUSTED_ORIGINS: z.string().transform((val) => val.split(",").map((v) => v.trim())),
  PAYBRIDGE_KEY_ID: z.string().optional(),
  PAYBRIDGE_PRIVATE_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  // eslint-disable-next-line n/no-process-exit -- must fail at boot, before any request is served
  process.exit(1);
}

export const env = parsed.data;

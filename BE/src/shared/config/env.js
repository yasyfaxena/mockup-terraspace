import { z } from "zod";

const DEFAULT_PORT = 3000;
const MIN_AUTH_SECRET_LENGTH = 32;
const PAYBRIDGE_APP_CODE_LENGTH = 4;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(DEFAULT_PORT),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(MIN_AUTH_SECRET_LENGTH),
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  TRUSTED_ORIGINS: z.string().transform((val) => val.split(",").map((origin) => origin.trim())),
  // PayBridge (payments.md §4) — all required, a missing key must fail at boot.
  PAYBRIDGE_BASE_URL: z.string().url(),
  PAYBRIDGE_KEY_ID: z.string().min(1),
  /** Ed25519 PEM, base64-encoded to survive env newlines. Never logged. */
  PAYBRIDGE_PRIVATE_KEY: z.string().min(1),
  PAYBRIDGE_APP_CODE: z.string().length(PAYBRIDGE_APP_CODE_LENGTH),
  PAYBRIDGE_CALLBACK_URL: z.string().url(),
  PAYBRIDGE_PROVIDER: z.enum(["xendit", "midtrans"]).default("xendit"),
  RESEND_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console -- pino isn't configured yet at this point in boot
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  // eslint-disable-next-line n/no-process-exit -- must fail at boot, before any request is served
  process.exit(1);
}

export const env = parsed.data;

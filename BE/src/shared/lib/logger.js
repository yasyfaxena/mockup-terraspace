import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : "info",
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  redact: [
    "req.headers.authorization",
    "req.headers.cookie",
    "*.password",
    "*.accessToken",
    // PayBridge (payments.md §4, §12) — the private key and any webhook
    // signature must never reach a log line, in either direction.
    "req.headers['x-signature']",
    "*.signature",
    "*.PAYBRIDGE_PRIVATE_KEY",
  ],
});

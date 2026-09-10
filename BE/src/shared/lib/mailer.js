import { Resend } from "resend";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const FROM_ADDRESS = "TerraSpace <onboarding@resend.dev>";

/**
 * Sends a transactional email via Resend. Delivery is best-effort — a
 * failure here must never block the request that triggered it (e.g. sign
 * up still succeeds even if the verification email fails to send).
 * @param {{ to: string, subject: string, html: string }} message
 * @returns {Promise<void>}
 */
export async function sendEmail({ to, subject, html }) {
  if (!resend) {
    logger.warn({ to, subject }, "RESEND_API_KEY not configured — email not sent");
    return;
  }

  const { error } = await resend.emails.send({ from: FROM_ADDRESS, to, subject, html });
  if (error) {
    logger.error({ err: error, to, subject }, "Failed to send email");
  }
}

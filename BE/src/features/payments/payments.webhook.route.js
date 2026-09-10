import express from "express";
import { webhook } from "./payments.controller.js";

const WEBHOOK_PATH = "/webhooks/paybridge";

/**
 * Mounts the PayBridge webhook directly on the Express app, unversioned,
 * outside `/api/v1` — mirroring `mountAuthHandler` (features/auth).
 *
 * Must run **before** `express.json()`, with `express.raw()` scoped to
 * this one route. Signature verification hashes the *exact* bytes
 * received; re-serializing a body already parsed to JSON changes
 * whitespace and breaks the SHA-256 hash (payments.md §7's non-negotiable
 * #1, libraries.md §2's sibling gotcha for Better Auth).
 * @param {import("express").Express} app
 */
export function mountPaymentsWebhook(app) {
  app.post(WEBHOOK_PATH, express.raw({ type: "application/json" }), webhook);
}

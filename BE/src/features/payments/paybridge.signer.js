import { createHash, createPrivateKey, randomUUID, sign as cryptoSign } from "node:crypto";
import { env } from "../../shared/config/env.js";

const REQUEST_EXPIRY_MINUTES = 5;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;
const REQUEST_EXPIRY_MS = REQUEST_EXPIRY_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND;

/** @type {import("node:crypto").KeyObject | undefined} */
let cachedPrivateKey;

/** @returns {import("node:crypto").KeyObject} */
function privateKey() {
  if (!cachedPrivateKey) {
    const pem = Buffer.from(env.PAYBRIDGE_PRIVATE_KEY, "base64").toString("utf8");
    cachedPrivateKey = createPrivateKey(pem);
  }
  return cachedPrivateKey;
}

/**
 * `{timestamp}\n{nonce}\n{METHOD}\n{path}\n{sha256(rawBody)}\n{expiryMs}` —
 * the exact string PayBridge signs on both sides of the integration
 * (payments.md §4). `path` includes the query string.
 * @param {{ timestamp: string, nonce: string, method: string, path: string, rawBody: string, expiry: string }} parts
 * @returns {string}
 */
export function buildStringToSign({ timestamp, nonce, method, path, rawBody, expiry }) {
  const bodyHash = createHash("sha256").update(rawBody).digest("hex");
  return [timestamp, nonce, method, path, bodyHash, expiry].join("\n");
}

/**
 * Signs an outgoing request to PayBridge with our Ed25519 private key.
 * @param {{ method: string, path: string, body: string }} request
 * @returns {Record<string, string>} the five `x-*` headers to send
 */
export function signRequest({ method, path, body }) {
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const expiry = String(REQUEST_EXPIRY_MS);
  const stringToSign = buildStringToSign({ timestamp, nonce, method, path, rawBody: body, expiry });
  const signature = cryptoSign(null, Buffer.from(stringToSign), privateKey()).toString("hex");

  return {
    "x-key-id": env.PAYBRIDGE_KEY_ID,
    "x-timestamp": timestamp,
    "x-nonce": nonce,
    "x-request-expiry": expiry,
    "x-signature": signature,
  };
}

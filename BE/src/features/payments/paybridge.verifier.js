import { createPublicKey, verify as cryptoVerify } from "node:crypto";
import { fetch } from "undici";
import { env } from "../../shared/config/env.js";
import { buildStringToSign } from "./paybridge.signer.js";

const REQUEST_EXPIRY_MINUTES = 5;
const TIMESTAMP_TOLERANCE_MINUTES = 5;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;
const REQUEST_EXPIRY_MAX_MS = REQUEST_EXPIRY_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND;
const TIMESTAMP_TOLERANCE_MS = TIMESTAMP_TOLERANCE_MINUTES * SECONDS_PER_MINUTE * MS_PER_SECOND;

/** @type {string | undefined} */
let cachedKeyId;
/** @type {import("node:crypto").KeyObject | undefined} */
let cachedPublicKey;

/** @returns {Promise<void>} */
async function fetchAndCachePlatformKey() {
  const res = await fetch(`${env.PAYBRIDGE_BASE_URL}/.well-known/paybridge-signing-key.json`);
  if (!res.ok) {
    throw new Error(`Unable to fetch PayBridge platform signing key (${res.status})`);
  }
  const body = /** @type {{ keyId: string, algorithm: string, publicKey: string }} */ (
    await res.json()
  );
  const rawKey = Buffer.from(body.publicKey, "hex");
  cachedKeyId = body.keyId;
  cachedPublicKey = createPublicKey({
    key: { kty: "OKP", crv: "Ed25519", x: rawKey.toString("base64url") },
    format: "jwk",
  });
}

/**
 * Fetches PayBridge's platform signing key (never our own merchant key
 * pair) and caches it, re-fetching only when `x-key-id` no longer matches
 * — payments.md §7. Returns `null` when even a fresh fetch doesn't
 * recognize the requested key id, which the caller treats as an invalid
 * signature.
 * @param {string} requestedKeyId
 * @returns {Promise<import("node:crypto").KeyObject | null>}
 */
async function platformPublicKey(requestedKeyId) {
  if (cachedKeyId !== requestedKeyId) {
    await fetchAndCachePlatformKey();
  }
  return cachedKeyId === requestedKeyId ? (cachedPublicKey ?? null) : null;
}

/**
 * @param {{ "x-key-id"?: string, "x-timestamp"?: string, "x-nonce"?: string, "x-request-expiry"?: string, "x-signature"?: string }} headers
 * @returns {boolean}
 */
function hasValidEnvelope(headers) {
  const { "x-key-id": keyId, "x-timestamp": timestamp, "x-nonce": nonce } = headers;
  const { "x-request-expiry": expiry, "x-signature": signature } = headers;
  if (!keyId || !timestamp || !nonce || !expiry || !signature) return false;

  const expiryMs = Number(expiry);
  if (!Number.isFinite(expiryMs) || expiryMs > REQUEST_EXPIRY_MAX_MS) return false;

  const requestTime = Number(timestamp);
  return (
    Number.isFinite(requestTime) && Math.abs(Date.now() - requestTime) <= TIMESTAMP_TOLERANCE_MS
  );
}

/**
 * Verifies an inbound PayBridge webhook against the exact raw bytes
 * received — never a re-serialized body (bookings.md's sibling gotcha,
 * payments.md §7's non-negotiable #1).
 * @param {{
 *   method: string, path: string, rawBody: string,
 *   headers: { "x-key-id"?: string, "x-timestamp"?: string, "x-nonce"?: string, "x-request-expiry"?: string, "x-signature"?: string },
 * }} request
 * @returns {Promise<boolean>}
 */
export async function verifyWebhookSignature({ method, path, rawBody, headers }) {
  if (!hasValidEnvelope(headers)) return false;

  const publicKey = await platformPublicKey(/** @type {string} */ (headers["x-key-id"]));
  if (!publicKey) return false;

  const stringToSign = buildStringToSign({
    timestamp: /** @type {string} */ (headers["x-timestamp"]),
    nonce: /** @type {string} */ (headers["x-nonce"]),
    method,
    path,
    rawBody,
    expiry: /** @type {string} */ (headers["x-request-expiry"]),
  });
  try {
    const signature = Buffer.from(/** @type {string} */ (headers["x-signature"]), "hex");
    return cryptoVerify(null, Buffer.from(stringToSign), publicKey, signature);
  } catch {
    return false;
  }
}

/** Test-only escape hatch — clears the cached platform key between test cases. */
export function resetPlatformKeyCache() {
  cachedKeyId = undefined;
  cachedPublicKey = undefined;
}

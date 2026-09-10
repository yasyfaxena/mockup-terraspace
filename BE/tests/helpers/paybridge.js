import { randomUUID, generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import { MockAgent, setGlobalDispatcher } from "undici";
import { env } from "../../src/shared/config/env.js";
import { buildStringToSign } from "../../src/features/payments/paybridge.signer.js";

// `nock` (this project's documented HTTP-mocking library) intercepts
// Node's `http`/`https` modules, but `paybridge.client.js`/`.verifier.js`
// call `undici`'s own `fetch`, which bypasses those entirely — nock
// cannot see those requests. `undici.MockAgent` is undici's own mocking
// mechanism and is what actually intercepts them; every PayBridge test
// helper here uses it instead of `nock`, despite testing.md's example.
const mockAgent = new MockAgent();
mockAgent.disableNetConnect();
setGlobalDispatcher(mockAgent);
const mockPool = mockAgent.get(env.PAYBRIDGE_BASE_URL);

export { mockAgent };

/** A throwaway Ed25519 keypair standing in for PayBridge's platform key — never call the real API from tests. */
export const testKeys = generateKeyPairSync("ed25519");
export const testKeyId = "test-platform-key";

const SPKI_ED25519_PREFIX_LENGTH = 12;

/** @returns {string} the hex-encoded raw 32-byte Ed25519 public key, matching PayBridge's well-known response shape */
function publicKeyHex() {
  const der = testKeys.publicKey.export({ type: "spki", format: "der" });
  return der.subarray(SPKI_ED25519_PREFIX_LENGTH).toString("hex");
}

/** Serves the platform signing key PayBridge exposes at `/.well-known/paybridge-signing-key.json`. */
export function mockPlatformKey() {
  return mockPool
    .intercept({ path: "/.well-known/paybridge-signing-key.json", method: "GET" })
    .reply(200, { keyId: testKeyId, algorithm: "Ed25519", publicKey: publicKeyHex() });
}

/** @param {object} [overrides] */
export function mockCharge(overrides = {}) {
  return mockPool.intercept({ path: "/charges", method: "POST" }).reply(201, {
    data: {
      id: "sess_1",
      orderId: "TSPC-1-3-18cf2a91b3c",
      provider: "xendit",
      amount: 166500,
      currency: "IDR",
      status: "awaiting_method_selection",
      checkoutUrl: "https://pay.test/checkout/sess_1",
      createdAt: new Date().toISOString(),
      ...overrides,
    },
  });
}

/** @param {object} [overrides] */
export function mockRefund(overrides = {}) {
  return mockPool.intercept({ path: "/refunds", method: "POST" }).reply(201, {
    data: {
      id: "refund_1",
      chargeId: "sess_1",
      amount: 50000,
      status: "succeeded",
      createdAt: new Date().toISOString(),
      ...overrides,
    },
  });
}

/** @param {Array<object>} [methods] */
export function mockPaymentMethods(methods) {
  return mockPool.intercept({ path: "/payment-methods/xendit", method: "GET" }).reply(200, {
    data: methods ?? [
      { code: "BCA_VIRTUAL_ACCOUNT", name: "BCA Virtual Account", category: "virtual_account" },
      { code: "OVO", name: "OVO", category: "e_wallet" },
    ],
  });
}

/**
 * Signs a webhook body exactly as PayBridge would, using the test
 * platform key, so verification is exercised for real (testing.md §3).
 * @param {string} rawBody
 * @param {string} [path]
 * @returns {Record<string, string>}
 */
export function signWebhook(rawBody, path = "/webhooks/paybridge") {
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const expiry = "300000";
  const stringToSign = buildStringToSign({
    timestamp,
    nonce,
    method: "POST",
    path,
    rawBody,
    expiry,
  });
  const signature = cryptoSign(null, Buffer.from(stringToSign), testKeys.privateKey).toString(
    "hex",
  );

  return {
    "x-key-id": testKeyId,
    "x-timestamp": timestamp,
    "x-nonce": nonce,
    "x-request-expiry": expiry,
    "x-signature": signature,
  };
}

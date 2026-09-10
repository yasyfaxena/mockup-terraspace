import { fetch } from "undici";
import { env } from "../../shared/config/env.js";
import { ProviderError, ProviderTimeout } from "../../shared/errors/http-errors.js";
import { signRequest } from "./paybridge.signer.js";

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Signs and sends one request to PayBridge. The body is serialized exactly
 * once — the same string is hashed for the signature and sent on the wire
 * (payments.md §4: "never `JSON.stringify` twice").
 * @param {{ method: string, path: string, body?: object }} request
 * @returns {Promise<any>}
 */
async function paybridgeRequest({ method, path, body }) {
  const serializedBody = body ? JSON.stringify(body) : "";
  const headers = signRequest({ method, path, body: serializedBody });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${env.PAYBRIDGE_BASE_URL}${path}`, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: serializedBody || undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (/** @type {{ name?: string }} */ (err).name === "AbortError") {
      throw new ProviderTimeout("PayBridge did not respond in time.");
    }
    throw new ProviderError("Unable to reach PayBridge.", { cause: err });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const bodyText = await res.text().catch(() => undefined);
    throw new ProviderError(`PayBridge returned ${res.status}.`, { cause: bodyText });
  }

  return res.json();
}

/**
 * @param {{ provider: string, amount: number, currency: string, customer: { name: string, email: string, mobileNumber: string }, description: string, items: Array<{ name: string, quantity: number, price: number, description?: string }>, metadata?: Record<string, string> }} payload
 * @returns {Promise<{ id: string, orderId: string, provider: string, amount: number, currency: string, status: string, checkoutUrl: string, createdAt: string }>}
 */
export async function createCharge(payload) {
  const res = await paybridgeRequest({ method: "POST", path: "/charges", body: payload });
  return res.data;
}

/**
 * Used by the reconciliation job to compare our record against PayBridge's.
 * @param {string} chargeId
 * @returns {Promise<any>}
 */
export async function getCharge(chargeId) {
  const res = await paybridgeRequest({ method: "GET", path: `/charges/${chargeId}` });
  return res.data;
}

/**
 * @param {{ chargeId: string, amount: number, reason?: string }} payload
 * @returns {Promise<{ id: string, chargeId: string, amount: number, status: string, reason?: string, createdAt: string }>}
 */
export async function createRefund(payload) {
  const res = await paybridgeRequest({ method: "POST", path: "/refunds", body: payload });
  return res.data;
}

/**
 * @param {string} provider
 * @returns {Promise<Array<{ code: string, name: string, category: string, docsUrl?: string }>>}
 */
export async function listPaymentMethods(provider) {
  const res = await paybridgeRequest({ method: "GET", path: `/payment-methods/${provider}` });
  return res.data;
}

import { describe, it, expect, beforeEach } from "vitest";
import {
  verifyWebhookSignature,
  resetPlatformKeyCache,
} from "../../../../src/features/payments/paybridge.verifier.js";
import { mockPlatformKey, signWebhook, testKeyId } from "../../../helpers/paybridge.js";

const PATH = "/webhooks/paybridge";
const BODY = JSON.stringify({ event: "payment_succeeded", orderId: "TSPC-1-3-abc" });

beforeEach(() => {
  resetPlatformKeyCache();
});

describe("verifyWebhookSignature", () => {
  it("accepts a validly signed webhook", async () => {
    mockPlatformKey();
    const headers = signWebhook(BODY, PATH);

    const verified = await verifyWebhookSignature({
      method: "POST",
      path: PATH,
      rawBody: BODY,
      headers,
    });
    expect(verified).toBe(true);
  });

  it("rejects a tampered body — signature was computed over different bytes (REG-012)", async () => {
    mockPlatformKey();
    const headers = signWebhook(BODY, PATH);
    const tamperedBody = JSON.stringify(
      { event: "payment_succeeded", orderId: "TSPC-1-3-abc" },
      null,
      2,
    );

    const verified = await verifyWebhookSignature({
      method: "POST",
      path: PATH,
      rawBody: tamperedBody,
      headers,
    });
    expect(verified).toBe(false);
  });

  it("rejects a signature from the wrong key", async () => {
    mockPlatformKey();
    const headers = signWebhook(BODY, PATH);
    const verified = await verifyWebhookSignature({
      method: "POST",
      path: PATH,
      rawBody: BODY,
      headers: { ...headers, "x-key-id": "some-other-key" },
    });
    expect(verified).toBe(false);
  });

  it("rejects when a required header is missing", async () => {
    const headers = signWebhook(BODY, PATH);
    const { "x-nonce": _drop, ...incomplete } = headers;
    const verified = await verifyWebhookSignature({
      method: "POST",
      path: PATH,
      rawBody: BODY,
      headers: incomplete,
    });
    expect(verified).toBe(false);
  });

  it("rejects an expiry beyond the 5-minute cap, not clamped", async () => {
    mockPlatformKey();
    const headers = signWebhook(BODY, PATH);
    const verified = await verifyWebhookSignature({
      method: "POST",
      path: PATH,
      rawBody: BODY,
      headers: { ...headers, "x-request-expiry": String(6 * 60 * 1000) },
    });
    expect(verified).toBe(false);
  });

  it("rejects a timestamp far outside the tolerance window", async () => {
    mockPlatformKey();
    const staleTimestamp = String(Date.now() - 10 * 60 * 1000);
    const headers = signWebhook(BODY, PATH);
    const verified = await verifyWebhookSignature({
      method: "POST",
      path: PATH,
      rawBody: BODY,
      headers: { ...headers, "x-timestamp": staleTimestamp },
    });
    expect(verified).toBe(false);
  });

  it("caches the platform key — a second lookup with the same key id succeeds without a second mock", async () => {
    // Only one mockPlatformKey() call for two verifications: if the cache
    // didn't hold, the second fetch would hit disableNetConnect() and fail.
    mockPlatformKey();
    const first = signWebhook(BODY, PATH);
    const firstVerified = await verifyWebhookSignature({
      method: "POST",
      path: PATH,
      rawBody: BODY,
      headers: first,
    });

    const second = signWebhook(BODY, PATH);
    const secondVerified = await verifyWebhookSignature({
      method: "POST",
      path: PATH,
      rawBody: BODY,
      headers: second,
    });

    expect(firstVerified).toBe(true);
    expect(secondVerified).toBe(true);
    expect(testKeyId).toBe("test-platform-key");
  });
});

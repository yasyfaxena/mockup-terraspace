import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient, ApiError } from "@/lib/api-client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("apiClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns typed success for a 2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { status: "healthy" })));

    const result = await apiClient.get<{ status: string }>("/health");

    expect(result).toEqual({ status: "healthy" });
  });

  it("throws ApiError for a 404, parsed from BE's envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(404, {
          error: { code: "NOT_FOUND", message: "Not found.", requestId: "req-1", details: null },
        }),
      ),
    );

    const error = await apiClient.get("/locations/does-not-exist").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "NOT_FOUND", status: 404, requestId: "req-1" });
  });

  it("throws ApiError for a 422, through the same parser as a 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(422, {
          error: {
            code: "VALIDATION_FAILED",
            message: "Request validation failed.",
            requestId: "req-2",
            details: [{ path: "startTime", message: "Required" }],
          },
        }),
      ),
    );

    const error = await apiClient.post("/bookings", {}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: "VALIDATION_FAILED",
      status: 422,
      details: [{ path: "startTime", message: "Required" }],
    });
  });

  it("falls back to UNKNOWN_ERROR when the body isn't the expected envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>502</html>", { status: 502 })),
    );

    const error = await apiClient.get("/health").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "UNKNOWN_ERROR", status: 502 });
  });
});

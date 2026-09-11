import { render, waitFor } from "@testing-library/react";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api-client";
import { createQueryClient } from "@/lib/query-client";
import { server } from "../../mocks/server";

// error-handling.md §3/§10 — "global toast fires for an unhandled code" and
// "the ERROR_CODE catalog actually reaches the toast," proven end to end: a
// real fetch through lib/api-client.ts, a real ApiError, the real
// queryCache onError handler, and the real errorMessages catalog from
// shared/i18n.tsx — only the network is faked.
describe("global query-client error handler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function Probe() {
    useQuery({
      queryKey: ["probe"],
      queryFn: () => apiClient.get("/api/v1/settings/public"),
      retry: false,
    });
    return null;
  }

  it("toasts the catalog translation for a known ERROR_CODE, not the raw message", async () => {
    server.use(
      http.get("http://localhost:3000/api/v1/settings/public", () =>
        HttpResponse.json(
          {
            error: {
              code: "INTERNAL_ERROR",
              message: "raw server message that should NOT be shown",
              requestId: "req_1",
              details: null,
            },
          },
          { status: 500 },
        ),
      ),
    );

    const toastSpy = vi.spyOn(toast, "error");
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <Probe />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith("Something went wrong on our end. Please try again.");
    });
  });

  it("falls back to the server's message for an ERROR_CODE with no translation", async () => {
    server.use(
      http.get("http://localhost:3000/api/v1/settings/public", () =>
        HttpResponse.json(
          {
            error: {
              code: "SOME_FUTURE_CODE_NOT_IN_THE_CATALOG",
              message: "a brand new BE error code",
              requestId: "req_2",
              details: null,
            },
          },
          { status: 500 },
        ),
      ),
    );

    const toastSpy = vi.spyOn(toast, "error");
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <Probe />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith("a brand new BE error code");
    });
  });
});

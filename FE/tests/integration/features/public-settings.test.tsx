import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { createQueryClient } from "@/lib/query-client";
import { usePublicSettings } from "@/features/settings";
import { buildPublicSettings } from "../../mocks/handlers/settings.handlers";
import { server } from "../../mocks/server";

// testing.md §4 — "Loading/empty/error states ... render with a delayed/
// empty/erroring MSW handler, assert the right one shows." usePublicSettings
// is the smallest real query hook in the app (no auth, no route), so it's
// the foundation case for this pattern before a heavier router+session
// harness exists (development-phases.md Phase 8 notes that gap explicitly).
function Probe() {
  const { data, isPending, isError } = usePublicSettings();
  if (isPending) return <p>Loading…</p>;
  if (isError) return <p>Could not load settings.</p>;
  return (
    <p>
      {data.companyName} · {data.currency}
    </p>
  );
}

function renderProbe() {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Probe />
    </QueryClientProvider>,
  );
}

describe("usePublicSettings loading/success/error states", () => {
  it("shows loading, then the real fetched settings", async () => {
    renderProbe();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(await screen.findByText("TerraSpace · IDR")).toBeInTheDocument();
  });

  it("reflects a MSW-overridden response, not a hardcoded fixture", async () => {
    server.use(
      http.get("http://localhost:3000/api/v1/settings/public", () =>
        HttpResponse.json(buildPublicSettings({ companyName: "Acme Spaces", currency: "USD" })),
      ),
    );
    renderProbe();
    expect(await screen.findByText("Acme Spaces · USD")).toBeInTheDocument();
  });

  it("shows the error state on a real 500, without crashing", async () => {
    server.use(
      http.get("http://localhost:3000/api/v1/settings/public", () =>
        HttpResponse.json(
          { error: { code: "INTERNAL_ERROR", message: "boom", requestId: "req_1", details: null } },
          { status: 500 },
        ),
      ),
    );
    renderProbe();
    // The default query client retries once with backoff before settling
    // into isError — longer than RTL's default 1s findByText timeout.
    expect(
      await screen.findByText("Could not load settings.", {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  });
});

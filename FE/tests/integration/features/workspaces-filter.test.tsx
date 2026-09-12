import { render, screen } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { createQueryClient } from "@/lib/query-client";
import { useWorkspaces } from "@/features/workspaces";
import { server } from "../../mocks/server";

function WorkspacesProbe({ minPrice, maxPrice }: { minPrice?: number; maxPrice?: number }) {
  const { data, isPending } = useWorkspaces({ minPrice, maxPrice });
  if (isPending) return <p>Loading workspaces…</p>;
  return (
    <div>
      <p>Total: {data?.meta.total}</p>
      <ul>
        {data?.data.map((w) => (
          <li key={w.id}>
            {w.name} - {w.pricing.pricePerHour}
          </li>
        ))}
      </ul>
    </div>
  );
}

describe("Workspaces price filtering", () => {
  it("passes minPrice and maxPrice query parameters to API endpoint", async () => {
    let capturedUrl = "";

    server.use(
      http.get("http://localhost:3000/api/v1/workspaces", ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({
          data: [
            {
              id: "w1",
              name: "Budget Desk",
              type: "hot_desk",
              pricing: { pricePerHour: "20000" },
              location: { name: "Central", city: "Jakarta" },
              amenities: [],
              availability: "available",
            },
          ],
          meta: { page: 1, limit: 12, total: 1, totalPages: 1 },
        });
      }),
    );

    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <WorkspacesProbe minPrice={15000} maxPrice={30000} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Budget Desk - 20000")).toBeInTheDocument();
    expect(capturedUrl).toContain("minPrice=15000");
    expect(capturedUrl).toContain("maxPrice=30000");
  });
});

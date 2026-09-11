import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { apiClient, ApiError } from "@/lib/api-client";
import { queryKeys } from "@/shared/query-keys";

type HealthResponse = { status: "healthy" | "unhealthy" };

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: queryKeys.health.all(),
    queryFn: () => apiClient.get<HealthResponse>("/health"),
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-xl font-semibold">TerraSpace V2 — Phase 0</h1>
      {isPending && <p>Checking BE/ health…</p>}
      {isError && (
        <p className="text-red-600">
          BE/ unreachable: {error instanceof ApiError ? error.code : error.message}
        </p>
      )}
      {data && <p>BE/ status: {data.status}</p>}
    </main>
  );
}

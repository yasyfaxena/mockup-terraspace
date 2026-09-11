import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { apiClient, ApiError } from "@/lib/api-client";
import { queryKeys } from "@/shared/query-keys";
import { SiteShell, PageHeader } from "@/components/layout/site-shell";

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
    <SiteShell>
      <PageHeader
        eyebrow="TerraSpace V2"
        title="Find your premium workspace"
        description="Phase 0/1 scaffold — catalog browsing lands in Phase 3."
      />
      <div className="container-page py-8 text-center text-sm">
        {isPending && <p>Checking BE/ health…</p>}
        {isError && (
          <p className="text-destructive">
            BE/ unreachable: {error instanceof ApiError ? error.code : error.message}
          </p>
        )}
        {data && <p>BE/ status: {data.status}</p>}
      </div>
    </SiteShell>
  );
}

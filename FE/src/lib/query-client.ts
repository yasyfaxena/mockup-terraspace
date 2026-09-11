import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "./api-client";

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: { suppressGlobalError?: boolean };
    mutationMeta: { suppressGlobalError?: boolean };
  }
}

function handleApiError(error: unknown) {
  if (!(error instanceof ApiError)) {
    toast.error("Something went wrong.");
    return;
  }
  toast.error(error.message);
}

/**
 * A factory, not a module-level singleton — `getRouter()` calls this once
 * per request. A shared instance would leak one request's cached data
 * (including another signed-in user's) into the next SSR request served by
 * the same Node process; client-side there's naturally only ever one call,
 * at app boot.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.meta?.suppressGlobalError) return;
        handleApiError(error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.meta?.suppressGlobalError) return;
        handleApiError(error);
      },
    }),
  });
}

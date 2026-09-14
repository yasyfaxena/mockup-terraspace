import { dehydrate, hydrate, type DehydratedState } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { createQueryClient } from "./lib/query-client";

export function getRouter() {
  const queryClient = createQueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    dehydrate: () =>
      ({
        queryClientState: dehydrate(queryClient),
      }) as unknown as { queryClientState: null },
    hydrate: (dehydrated) => {
      const state = (dehydrated as unknown as { queryClientState?: DehydratedState })
        ?.queryClientState;
      if (state) {
        hydrate(queryClient, state);
      }
    },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

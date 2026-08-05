import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Sensible default for catalog/content data: avoids a refetch on
        // every remount/window-refocus within this window. Queries for
        // per-customer data (orders, loyalty, address, session) override
        // this back down to 0 where they're declared, since that data must
        // always be read fresh.
        staleTime: 60_000,
        gcTime: 15 * 60_000,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Cross-fades between routes via the native View Transitions API (see
    // ::view-transition-old/new(root) in styles.css). No-ops automatically
    // in browsers that don't support it.
    defaultViewTransition: true,
  });

  return router;
};

import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

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

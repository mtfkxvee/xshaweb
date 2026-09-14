import { createFileRoute } from "@tanstack/react-router";
import { resolveLoyaltyStatus } from "@/lib/erpnext/loyalty";
import { corsPreflight, json, requireMobileUser } from "@/lib/erpnext/mobile-request";

export const Route = createFileRoute("/api/mobile/loyalty")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: async ({ request }) => {
        const user = await requireMobileUser(request);
        return json(await resolveLoyaltyStatus(user?.customer ?? null));
      },
    },
  },
});

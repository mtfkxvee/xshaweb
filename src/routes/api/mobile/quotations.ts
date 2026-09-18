import { createFileRoute } from "@tanstack/react-router";
import { resolveMyQuotations } from "@/lib/erpnext/orders";
import { corsPreflight, json, requireMobileUser } from "@/lib/erpnext/mobile-request";

export const Route = createFileRoute("/api/mobile/quotations")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: async ({ request }) => {
        const user = await requireMobileUser(request);
        return json(await resolveMyQuotations(user?.customer ?? null));
      },
    },
  },
});

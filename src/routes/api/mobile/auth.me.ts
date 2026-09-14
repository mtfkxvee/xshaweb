import { createFileRoute } from "@tanstack/react-router";
import { corsPreflight, json, requireMobileUser } from "@/lib/erpnext/mobile-request";

export const Route = createFileRoute("/api/mobile/auth/me")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: async ({ request }) => json(await requireMobileUser(request)),
    },
  },
});

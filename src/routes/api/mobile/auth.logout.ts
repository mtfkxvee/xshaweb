import { createFileRoute } from "@tanstack/react-router";
import { endErpnextSession } from "@/lib/erpnext/auth";
import { corsPreflight, getBearerSid, json } from "@/lib/erpnext/mobile-request";

export const Route = createFileRoute("/api/mobile/auth/logout")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      POST: async ({ request }) => {
        const sid = getBearerSid(request);
        if (sid) await endErpnextSession(sid);
        return json({ ok: true });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { getErpnextConfig } from "@/lib/erpnext/config";

// For uptime monitors: 200 only when this Worker AND ERPNext both answer, so
// "the site is up but orders can't load" doesn't look healthy. Deliberately
// returns nothing sensitive and never touches customer data.
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const config = getErpnextConfig();
        let erpnext: "ok" | "down" | "not_configured" = "not_configured";
        if (config) {
          try {
            const res = await fetch(`${config.url}/api/method/ping`, {
              signal: AbortSignal.timeout(5000),
            });
            erpnext = res.ok ? "ok" : "down";
          } catch {
            erpnext = "down";
          }
        }
        const healthy = erpnext === "ok";
        return new Response(JSON.stringify({ ok: healthy, erpnext, time: new Date().toISOString() }), {
          status: healthy ? 200 : 503,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});

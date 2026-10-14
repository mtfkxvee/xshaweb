import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { reconcilePendingPayments } from "@/lib/erpnext/orders";

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Meant to be called on a schedule (every few minutes) by anything that can
// send an HTTP request — an ERPNext scheduled script, a cron service, or a
// Cloudflare cron trigger. It checks recent unpaid orders against DOKU and
// books the ones that were actually paid, repairing a missed webhook.
// Authenticated with the same shared secret as the delivery-push trigger.
export const Route = createFileRoute("/api/internal/reconcile-payments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PUSH_NOTIFY_SECRET;
        if (!secret) return new Response("Not configured", { status: 503 });
        if (!secretMatches(request.headers.get("X-Notify-Secret"), secret)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const summary = await reconcilePendingPayments();
        return new Response(JSON.stringify(summary), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});

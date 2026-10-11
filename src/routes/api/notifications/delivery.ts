import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";
import { notifyDeliveryUpdate, type DeliveryEvent } from "@/lib/erpnext/push";

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Server-to-server: called by an ERPNext Server Script whenever a Delivery
// Request is created or its delivery_status changes. Not a customer-facing
// route, so it's authenticated with a shared secret (PUSH_NOTIFY_SECRET)
// instead of a customer session. Always answers 200 for a well-formed,
// authorized call so ERPNext never treats a failed push as a failed save.
export const Route = createFileRoute("/api/notifications/delivery")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PUSH_NOTIFY_SECRET;
        if (!secret) return new Response("Push notify not configured", { status: 503 });
        if (!secretMatches(request.headers.get("X-Notify-Secret"), secret)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const body = (await request.json().catch(() => null)) as {
          delivery_request?: string;
          event?: DeliveryEvent;
        } | null;
        if (!body?.delivery_request) return new Response("delivery_request required", { status: 400 });

        const result = await notifyDeliveryUpdate(
          body.delivery_request,
          body.event === "insert" ? "insert" : "update",
        );
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { verifyDokuNotificationSignature } from "@/lib/erpnext/doku";
import { handleDokuNotification, type DokuNotification } from "@/lib/erpnext/payment-webhook";

const NOTIFICATION_PATH = "/api/payments/doku-notification";

// DOKU calls this server-to-server once a Checkout payment settles (see
// developers.doku.com/get-started-with-doku-api/notification). It's public
// (no bearer token — DOKU has no way to obtain one) and instead
// authenticated via DOKU's own Signature header, verified against the raw
// body text below.
export const Route = createFileRoute("/api/payments/doku-notification")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();

        const verified = verifyDokuNotificationSignature({
          requestTarget: NOTIFICATION_PATH,
          headers: {
            clientId: request.headers.get("Client-Id"),
            requestId: request.headers.get("Request-Id"),
            timestamp: request.headers.get("Request-Timestamp"),
            signature: request.headers.get("Signature"),
          },
          rawBody,
        });
        if (!verified) return new Response("Invalid signature", { status: 401 });

        let body: DokuNotification;
        try {
          body = JSON.parse(rawBody) as DokuNotification;
        } catch {
          return new Response("Invalid body", { status: 400 });
        }

        // See handleDokuNotification for why a failure answers 500.
        const { retry } = await handleDokuNotification(body);
        if (retry) {
          return new Response(
            JSON.stringify({ responseCode: "5005600", responseMessage: "Failed, please retry" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({ responseCode: "2005600", responseMessage: "Success", approvalCode: "APPROVED" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});

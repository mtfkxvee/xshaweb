import { createFileRoute } from "@tanstack/react-router";
import { convertQuotationToSalesOrder } from "@/lib/erpnext/orders";
import { verifyDokuNotificationSignature } from "@/lib/erpnext/doku";

const NOTIFICATION_PATH = "/api/payments/doku-notification";

type DokuNotification = {
  transaction?: { status?: string };
  order?: { invoice_number?: string };
};

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

        const body = JSON.parse(rawBody) as DokuNotification;
        const invoiceNumber = body.order?.invoice_number;
        const status = body.transaction?.status;

        if (invoiceNumber && status === "SUCCESS") {
          // Best-effort: DOKU only requires HTTP 200 to stop retrying, and
          // a failed conversion here shouldn't look like a rejected
          // notification (that would make DOKU keep retrying an already-
          // acknowledged payment) — staff can still find the paid
          // Quotation and convert it by hand if this ever fails silently.
          await convertQuotationToSalesOrder(invoiceNumber).catch(() => {});
        }

        return new Response(
          JSON.stringify({ responseCode: "2005600", responseMessage: "Success", approvalCode: "APPROVED" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { convertQuotationToSalesOrder, type ConvertResult } from "@/lib/erpnext/orders";
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
          // DOKU stops retrying only once it gets HTTP 200, so a payment
          // we failed to record must NOT be acknowledged — otherwise the
          // customer has paid, DOKU believes we know it, and the order
          // sits "unpaid" forever. Answering with an error makes DOKU
          // re-send (and its Notification Center shows it as failed, with
          // a resend button once the cause is fixed). That is safe because
          // the conversion is idempotent: a retry never duplicates the
          // Sales Order. Only an invoice that isn't ours at all is
          // acknowledged, since retrying that could never succeed.
          const result = await convertQuotationToSalesOrder(invoiceNumber).catch(
            (error: unknown): ConvertResult => ({
              ok: false,
              message: error instanceof Error ? error.message : String(error),
              retryable: true,
            }),
          );
          if (!result.ok) {
            console.error(`DOKU payment for ${invoiceNumber} not recorded: ${result.message}`);
            if (result.retryable) {
              return new Response(
                JSON.stringify({ responseCode: "5005600", responseMessage: "Failed, please retry" }),
                { status: 500, headers: { "Content-Type": "application/json" } },
              );
            }
          }
        }

        return new Response(
          JSON.stringify({ responseCode: "2005600", responseMessage: "Success", approvalCode: "APPROVED" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});

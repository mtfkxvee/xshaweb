import { createHash, createHmac, randomUUID } from "node:crypto";
import { getDokuConfig } from "./config";

const CHECKOUT_PATH = "/checkout/v1/payment";

// DOKU's non-SNAP request signature: HMAC-SHA256 over a fixed set of
// newline-joined "Label:value" lines (no trailing newline), keyed with the
// merchant's Secret Key. The same construction is used to both sign our
// own requests to DOKU and verify the notifications DOKU sends back —
// only `requestTarget` and which body is digested differ.
// See: developers.doku.com/get-started-with-doku-api/signature-component/non-snap
function buildSignature(opts: {
  secretKey: string;
  clientId: string;
  requestId: string;
  timestamp: string;
  requestTarget: string;
  rawBody: string;
}): string {
  const digest = createHash("sha256").update(opts.rawBody).digest("base64");
  const stringToSign = [
    `Client-Id:${opts.clientId}`,
    `Request-Id:${opts.requestId}`,
    `Request-Timestamp:${opts.timestamp}`,
    `Request-Target:${opts.requestTarget}`,
    `Digest:${digest}`,
  ].join("\n");
  const hmac = createHmac("sha256", opts.secretKey).update(stringToSign).digest("base64");
  return `HMACSHA256=${hmac}`;
}

export type DokuCheckoutResult =
  | { ok: true; url: string; sessionId: string }
  | { ok: false; message: string };

// Creates a hosted DOKU Checkout payment session for one order. The
// invoice_number doubles as our own lookup key when DOKU later notifies us
// which order got paid — it's set to the ERPNext Quotation's own name so
// no separate mapping table is needed.
export async function createDokuCheckoutSession(opts: {
  invoiceNumber: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  returnUrl: string;
}): Promise<DokuCheckoutResult> {
  const config = getDokuConfig();
  if (!config) return { ok: false, message: "DOKU belum dikonfigurasi." };

  const amount = Math.round(opts.amount);
  const body = {
    order: {
      amount,
      invoice_number: opts.invoiceNumber,
      callback_url: opts.returnUrl,
      callback_url_result: opts.returnUrl,
      auto_redirect: true,
      // DOKU rejects an order whose line items don't sum to `amount`
      // ("AMOUNT NOT MATCH") — an empty list counts as summing to 0. One
      // summary line always matches, whatever tax/discount is baked into
      // the total.
      line_items: [{ name: `Pesanan ${opts.invoiceNumber}`, price: amount, quantity: 1 }],
    },
    payment: { payment_due_date: 60 },
    customer: {
      name: opts.customerName,
      email: opts.customerEmail,
    },
  };
  const rawBody = JSON.stringify(body);

  const requestId = randomUUID();
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const signature = buildSignature({
    secretKey: config.secretKey,
    clientId: config.clientId,
    requestId,
    timestamp,
    requestTarget: CHECKOUT_PATH,
    rawBody,
  });

  const res = await fetch(`${config.baseUrl}${CHECKOUT_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Id": config.clientId,
      "Request-Id": requestId,
      "Request-Timestamp": timestamp,
      Signature: signature,
    },
    body: rawBody,
  });

  const json = (await res.json().catch(() => null)) as {
    response?: { order?: { session_id?: string }; payment?: { url?: string } };
    error_messages?: string[];
  } | null;

  if (!res.ok || !json?.response?.payment?.url) {
    const message = json?.error_messages?.join(", ") || `DOKU gagal (${res.status})`;
    return { ok: false, message };
  }

  return {
    ok: true,
    url: json.response.payment.url,
    sessionId: json.response.order?.session_id ?? "",
  };
}

// Verifies an inbound DOKU notification's Signature header against the raw
// body DOKU actually sent (must be the untouched request text — re-
// serializing a parsed JSON object can reorder keys/whitespace and break
// the digest comparison).
export function verifyDokuNotificationSignature(opts: {
  requestTarget: string;
  headers: { clientId: string | null; requestId: string | null; timestamp: string | null; signature: string | null };
  rawBody: string;
}): boolean {
  const config = getDokuConfig();
  if (!config) return false;
  const { clientId, requestId, timestamp, signature } = opts.headers;
  if (!clientId || !requestId || !timestamp || !signature) return false;
  if (clientId !== config.clientId) return false;

  const expected = buildSignature({
    secretKey: config.secretKey,
    clientId,
    requestId,
    timestamp,
    requestTarget: opts.requestTarget,
    rawBody: opts.rawBody,
  });
  return expected === signature;
}

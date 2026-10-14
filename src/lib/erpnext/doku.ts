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
  // Omitted for body-less (GET) requests, which sign no Digest line.
  rawBody?: string;
}): string {
  const lines = [
    `Client-Id:${opts.clientId}`,
    `Request-Id:${opts.requestId}`,
    `Request-Timestamp:${opts.timestamp}`,
    `Request-Target:${opts.requestTarget}`,
  ];
  if (opts.rawBody !== undefined) {
    lines.push(`Digest:${createHash("sha256").update(opts.rawBody).digest("base64")}`);
  }
  const stringToSign = lines.join("\n");
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

export type DokuOrderStatus =
  | { ok: true; status: string | null; amount: number | null }
  | { ok: false; message: string };

// Asks DOKU directly whether an invoice was paid — the safety net for a
// webhook that never arrived or failed for good. `status` is null when DOKU
// has no such order (never opened / expired), which is just "not paid".
export async function getDokuOrderStatus(invoiceNumber: string): Promise<DokuOrderStatus> {
  const config = getDokuConfig();
  if (!config) return { ok: false, message: "DOKU belum dikonfigurasi." };

  const target = `/orders/v1/status/${encodeURIComponent(invoiceNumber)}`;
  const requestId = randomUUID();
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const signature = buildSignature({
    secretKey: config.secretKey,
    clientId: config.clientId,
    requestId,
    timestamp,
    requestTarget: target,
  });

  try {
    const res = await fetch(`${config.baseUrl}${target}`, {
      headers: {
        "Client-Id": config.clientId,
        "Request-Id": requestId,
        "Request-Timestamp": timestamp,
        Signature: signature,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) return { ok: true, status: null, amount: null };

    const json = (await res.json().catch(() => null)) as {
      order?: { amount?: number | string };
      transaction?: { status?: string };
      error?: { message?: string };
    } | null;
    if (!res.ok) {
      return { ok: false, message: json?.error?.message ?? `DOKU status gagal (${res.status})` };
    }

    const amount = Number(json?.order?.amount);
    return {
      ok: true,
      status: json?.transaction?.status ?? null,
      amount: Number.isFinite(amount) ? amount : null,
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

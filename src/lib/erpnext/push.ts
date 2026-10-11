import { erpRequest, jsonFields, jsonFilters } from "./client";
import { isErpnextConfigured } from "./config";

// Expo push tokens for a customer's devices, stored as a JSON array on
// Customer.custom_push_tokens_mobile_app (Long Text custom field in ERPNext) — a
// customer can be signed in on more than one phone.
const TOKENS_FIELD = "custom_push_tokens_mobile_app";
const MAX_TOKENS_PER_CUSTOMER = 5;
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const TOKEN_PATTERN = /^Expo(nent)?PushToken\[[^\]]+\]$/;

function parseTokens(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

async function readTokens(customerId: string): Promise<string[]> {
  const res = await erpRequest<{ data: Record<string, string | null> }>(
    `/api/resource/Customer/${encodeURIComponent(customerId)}`,
  );
  return parseTokens(res.data[TOKENS_FIELD]);
}

async function writeTokens(customerId: string, tokens: string[]): Promise<void> {
  await erpRequest(`/api/resource/Customer/${encodeURIComponent(customerId)}`, {
    method: "PUT",
    body: { [TOKENS_FIELD]: JSON.stringify(tokens) },
  });
}

// Drops `token` from every customer except `keepCustomerId` — a phone that
// was signed in as someone else before must stop receiving that person's
// notifications the moment a different account registers it.
async function detachTokenFromOthers(token: string, keepCustomerId: string | null): Promise<void> {
  const res = await erpRequest<{ data: ({ name: string } & Record<string, string | null>)[] }>(
    "/api/resource/Customer",
    {
      params: {
        fields: jsonFields(["name", TOKENS_FIELD]),
        filters: jsonFilters([[TOKENS_FIELD, "like", `%${token}%`]]),
        limit_page_length: "0",
      },
    },
  );
  for (const row of res.data) {
    if (row.name === keepCustomerId) continue;
    const remaining = parseTokens(row[TOKENS_FIELD]).filter((t) => t !== token);
    await writeTokens(row.name, remaining);
  }
}

export type PushTokenResult = { ok: true } | { ok: false; message: string };

export async function registerPushToken(customerId: string, token: string): Promise<PushTokenResult> {
  if (!isErpnextConfigured()) return { ok: false, message: "ERPNext belum dikonfigurasi." };
  if (!TOKEN_PATTERN.test(token)) return { ok: false, message: "Token notifikasi tidak valid." };

  try {
    await detachTokenFromOthers(token, customerId);
    const existing = await readTokens(customerId);
    if (existing[0] === token) return { ok: true };
    const next = [token, ...existing.filter((t) => t !== token)].slice(0, MAX_TOKENS_PER_CUSTOMER);
    await writeTokens(customerId, next);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

export async function unregisterPushToken(customerId: string, token: string): Promise<PushTokenResult> {
  if (!isErpnextConfigured()) return { ok: false, message: "ERPNext belum dikonfigurasi." };
  try {
    const existing = await readTokens(customerId);
    if (existing.includes(token)) {
      await writeTokens(
        customerId,
        existing.filter((t) => t !== token),
      );
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

type PushMessage = { title: string; body: string; data?: Record<string, unknown> };

// Best-effort: a failed push must never fail the ERPNext event that
// triggered it, so errors are swallowed and reported as `sent: 0`.
export async function sendPushToCustomer(customerId: string, message: PushMessage): Promise<number> {
  let tokens: string[];
  try {
    tokens = await readTokens(customerId);
  } catch {
    return 0;
  }
  if (tokens.length === 0) return 0;

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(
      tokens.map((to) => ({
        to,
        title: message.title,
        body: message.body,
        data: message.data ?? {},
        sound: "default",
        priority: "high",
        channelId: "default",
      })),
    ),
  }).catch(() => null);
  if (!res?.ok) return 0;

  const json = (await res.json().catch(() => null)) as {
    data?: { status: string; details?: { error?: string } }[];
  } | null;
  const tickets = json?.data ?? [];

  // Expo reports tokens whose app was uninstalled / token revoked — prune
  // them so they don't pile up against the per-customer cap.
  const dead = tokens.filter((_, i) => tickets[i]?.details?.error === "DeviceNotRegistered");
  if (dead.length > 0) {
    await writeTokens(
      customerId,
      tokens.filter((t) => !dead.includes(t)),
    ).catch(() => {});
  }
  return tickets.filter((t) => t.status === "ok").length;
}

export type DeliveryEvent = "insert" | "update";

function deliveryMessage(
  status: string,
  event: DeliveryEvent,
  orderId: string,
): { title: string; body: string } | null {
  // A brand-new Delivery Request is the moment staff pressed "Kirim" —
  // always worth telling the customer, whatever status it starts with.
  if (event === "insert") {
    return { title: "Pesanan Sedang Dikirim", body: `Pesanan ${orderId} sedang dalam proses pengiriman.` };
  }
  switch (status) {
    case "Dalam Perjalanan":
      return { title: "Kurir Dalam Perjalanan", body: `Pesanan ${orderId} sedang diantar ke alamat Anda.` };
    case "Terkirim":
      return { title: "Pesanan Diterima", body: `Pesanan ${orderId} telah diterima. Terima kasih!` };
    case "Gagal":
      return {
        title: "Pengiriman Bermasalah",
        body: `Pengiriman pesanan ${orderId} belum berhasil. Tim kami akan menghubungi Anda.`,
      };
    // "Pending" / "Ditugaskan" are internal courier steps with nothing new
    // for the customer to know beyond the insert notification above.
    default:
      return null;
  }
}

export type DeliveryNotifyResult =
  | { ok: true; sent: number; skipped?: string }
  | { ok: false; message: string };

// Called by the ERPNext Server Script on Delivery Request (after insert and
// on delivery_status change) via /api/notifications/delivery. Resolves who
// to notify through the same chain the app uses to show order progress:
// Delivery Request.sales_invoice -> Sales Invoice.customer, and the order
// id shown in the app (the Quotation) via Sales Invoice -> Sales Order ->
// Quotation (prevdoc_docname).
export async function notifyDeliveryUpdate(
  deliveryRequest: string,
  event: DeliveryEvent,
): Promise<DeliveryNotifyResult> {
  if (!isErpnextConfigured()) return { ok: false, message: "ERPNext belum dikonfigurasi." };

  try {
    const dr = await erpRequest<{ data: { sales_invoice: string | null; delivery_status: string | null } }>(
      `/api/resource/Delivery Request/${encodeURIComponent(deliveryRequest)}`,
    );
    const salesInvoice = dr.data.sales_invoice;
    if (!salesInvoice) return { ok: true, sent: 0, skipped: "no sales invoice" };

    const si = await erpRequest<{
      data: { customer: string; items: { sales_order: string | null }[] };
    }>(`/api/resource/Sales Invoice/${encodeURIComponent(salesInvoice)}`);

    let orderId = salesInvoice;
    const salesOrder = si.data.items.find((i) => i.sales_order)?.sales_order;
    if (salesOrder) {
      const so = await erpRequest<{ data: { items: { prevdoc_docname: string | null }[] } }>(
        `/api/resource/Sales Order/${encodeURIComponent(salesOrder)}`,
      );
      orderId = so.data.items.find((i) => i.prevdoc_docname)?.prevdoc_docname ?? salesOrder;
    }

    const message = deliveryMessage(dr.data.delivery_status ?? "", event, orderId);
    if (!message) return { ok: true, sent: 0, skipped: "status has no notification" };

    const sent = await sendPushToCustomer(si.data.customer, {
      ...message,
      // Tapping the notification opens this order in the app (OrderDetail,
      // source "pesanan" = Quotation id).
      data: { type: "delivery", orderId },
    });
    return { ok: true, sent };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

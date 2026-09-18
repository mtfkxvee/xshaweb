import { createServerFn } from "@tanstack/react-start";
import { getCookie, setResponseHeader } from "@tanstack/react-start/server";
import { getCurrentCustomer, SESSION_COOKIE } from "./auth";
import { erpRequest, erpToday, jsonFields, jsonFilters } from "./client";
import { isErpnextConfigured } from "./config";
import { mockOrders } from "./mock-data";
import type { Customer, Order, OrderDetail, OrderLine } from "./types";

const COMPANY = "X-SHA";
const CURRENCY = "IDR";
const PRICE_LIST = "Standard Selling";

export type CreateOrderResult =
  | { ok: true; orderId: string }
  | {
      ok: false;
      reason: "not_configured" | "not_authenticated" | "erpnext_error";
      message?: string;
    };

// Extracted so the mobile `/api/mobile/orders` route (bearer-token auth) can
// place an order for an already-resolved customer, without re-deriving it
// from a cookie.
export async function submitOrder(
  customer: Customer | null,
  items: OrderLine[],
  note?: string,
): Promise<CreateOrderResult> {
  if (!isErpnextConfigured()) return { ok: false, reason: "not_configured" };
  if (!customer) return { ok: false, reason: "not_authenticated" };

  try {
    const today = erpToday();

    // Item lookups and the Quotation write use the admin API key rather
    // than the customer's own session — a portal customer role typically
    // can't read Item or create Quotation records directly in ERPNext.
    //
    // `rate` is re-fetched from the Item itself here rather than trusted
    // from the client's OrderLine — the app only ever sends `rate` back to
    // itself as a display convenience, but a modified client (or a direct
    // API call with a valid bearer token) could otherwise submit an
    // arbitrary price. `qty` is clamped to a sane positive integer for the
    // same reason.
    const items_ = await Promise.all(
      items.map(async (line) => {
        const itemRes = await erpRequest<{ data: { stock_uom: string; standard_rate: number } }>(
          `/api/resource/Item/${encodeURIComponent(line.itemCode)}`,
          { params: { fields: jsonFields(["stock_uom", "standard_rate"]) } },
        );
        const qty = Math.max(1, Math.floor(Number(line.qty)) || 1);
        return {
          item_code: line.itemCode,
          item_name: line.itemName,
          qty,
          rate: itemRes.data.standard_rate ?? 0,
          uom: itemRes.data.stock_uom,
          conversion_factor: 1,
        };
      }),
    );

    const res = await erpRequest<{ data: { name: string } }>("/api/resource/Quotation", {
      method: "POST",
      body: {
        quotation_to: "Customer",
        party_name: customer.id,
        transaction_date: today,
        order_type: "Shopping Cart",
        company: COMPANY,
        currency: CURRENCY,
        conversion_rate: 1,
        selling_price_list: PRICE_LIST,
        price_list_currency: CURRENCY,
        plc_conversion_rate: 1,
        items: items_,
        ...(note ? { other_charges_calculation: note } : {}),
      },
    });

    return { ok: true, orderId: res.data.name };
  } catch (error) {
    return {
      ok: false,
      reason: "erpnext_error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export const createOrder = createServerFn({ method: "POST" })
  .validator((input: { items: OrderLine[]; note?: string }) => input)
  .handler(async ({ data }): Promise<CreateOrderResult> => {
    if (!isErpnextConfigured()) return { ok: false, reason: "not_configured" };

    const sid = getCookie(SESSION_COOKIE);
    if (!sid) return { ok: false, reason: "not_authenticated" };

    const auth = await getCurrentCustomer();
    return submitOrder(auth?.customer ?? null, data.items, data.note);
  });

// Extracted so the mobile `/api/mobile/orders` route can resolve the same
// order history for an already-resolved customer.
export async function resolveOrders(customer: Customer | null): Promise<Order[]> {
  if (!isErpnextConfigured()) return mockOrders;
  if (!customer) return [];

  // "Riwayat Transaksi" shows completed purchases — those live in Sales
  // Invoice (in-store POS/checkout), not Quotation (Quotation is only the
  // not-yet-fulfilled cart order this site itself creates on checkout).
  // docstatus=1 excludes drafts and cancelled invoices.
  const res = await erpRequest<{
    data: { name: string; posting_date: string; status: string; grand_total: number }[];
  }>("/api/resource/Sales Invoice", {
    params: {
      fields: jsonFields(["name", "posting_date", "status", "grand_total"]),
      filters: jsonFilters([
        ["customer", "=", customer.id],
        ["docstatus", "=", 1],
      ]),
      order_by: "posting_date desc",
      limit_page_length: "20",
    },
  });

  return res.data.map((inv) => ({
    id: inv.name,
    date: inv.posting_date,
    status: inv.status,
    total: inv.grand_total,
  }));
}

// A single invoice's full detail (line items included) — GETting one
// Sales Invoice by name returns its whole document, child tables and all,
// so no extra dotted-field trickery is needed the way list queries need.
// We still re-check ownership ourselves since ERPNext's REST API doesn't
// scope a single-doc GET to "only if this session/customer owns it" ---
// wrong result here would leak another customer's purchase to a guessed id.
export async function resolveOrderDetail(
  customer: Customer | null,
  orderId: string,
): Promise<OrderDetail | null> {
  if (!isErpnextConfigured() || !customer) return null;

  try {
    const res = await erpRequest<{
      data: {
        name: string;
        posting_date: string;
        status: string;
        grand_total: number;
        customer: string;
        items: { item_code: string; item_name: string; qty: number; rate: number; amount: number; uom: string }[];
      };
    }>(`/api/resource/Sales Invoice/${encodeURIComponent(orderId)}`);

    const inv = res.data;
    if (inv.customer !== customer.id) return null;

    return {
      id: inv.name,
      date: inv.posting_date,
      status: inv.status,
      total: inv.grand_total,
      items: inv.items.map((it) => ({
        itemCode: it.item_code,
        itemName: it.item_name,
        qty: it.qty,
        rate: it.rate,
        amount: it.amount,
        uom: it.uom,
      })),
    };
  } catch {
    return null;
  }
}

export const getMyOrders = createServerFn({ method: "GET" }).handler(async (): Promise<Order[]> => {
  // Per-customer order history — never cache (same fixed no-arg URL every call).
  setResponseHeader("Cache-Control", "no-store");

  if (!isErpnextConfigured()) return mockOrders;

  const sid = getCookie(SESSION_COOKIE);
  if (!sid) return [];

  const auth = await getCurrentCustomer();
  return resolveOrders(auth?.customer ?? null);
});

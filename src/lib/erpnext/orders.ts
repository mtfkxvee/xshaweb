import { createServerFn } from "@tanstack/react-start";
import { getCookie, setResponseHeader } from "@tanstack/react-start/server";
import { getCurrentCustomer, SESSION_COOKIE } from "./auth";
import { erpRequest, erpToday, jsonFields, jsonFilters } from "./client";
import { isErpnextConfigured } from "./config";
import { mockOrders } from "./mock-data";
import type { Customer, Order, OrderLine } from "./types";

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
    const items_ = await Promise.all(
      items.map(async (line) => {
        const itemRes = await erpRequest<{ data: { stock_uom: string } }>(
          `/api/resource/Item/${encodeURIComponent(line.itemCode)}`,
          { params: { fields: jsonFields(["stock_uom"]) } },
        );
        return {
          item_code: line.itemCode,
          item_name: line.itemName,
          qty: line.qty,
          rate: line.rate,
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

export const getMyOrders = createServerFn({ method: "GET" }).handler(async (): Promise<Order[]> => {
  // Per-customer order history — never cache (same fixed no-arg URL every call).
  setResponseHeader("Cache-Control", "no-store");

  if (!isErpnextConfigured()) return mockOrders;

  const sid = getCookie(SESSION_COOKIE);
  if (!sid) return [];

  const auth = await getCurrentCustomer();
  return resolveOrders(auth?.customer ?? null);
});

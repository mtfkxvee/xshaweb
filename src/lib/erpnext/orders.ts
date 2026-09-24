import { createServerFn } from "@tanstack/react-start";
import { getCookie, setResponseHeader } from "@tanstack/react-start/server";
import { getCurrentCustomer, SESSION_COOKIE } from "./auth";
import { erpRequest, erpToday, jsonFields, jsonFilters } from "./client";
import { isErpnextConfigured } from "./config";
import { createDokuCheckoutSession } from "./doku";
import { mockOrders } from "./mock-data";
import type { Customer, Order, OrderDetail, OrderLine, OrderStage, Pesanan } from "./types";

const COMPANY = "X-SHA";
const CURRENCY = "IDR";
const PRICE_LIST = "Standard Selling";
// All DOKU checkout payments (VA, e-wallet, QRIS, etc.) are recorded under
// this one Mode of Payment on the resulting Sales Order — regardless of
// which specific channel the customer actually paid through.
const DOKU_PAYMENT_METHOD = "QRIS ONLINE";

export type CreateOrderResult =
  | { ok: true; orderId: string; paymentUrl?: string; paymentError?: string }
  | {
      ok: false;
      reason: "not_configured" | "not_authenticated" | "erpnext_error";
      message?: string;
    };

// Extracted so the mobile `/api/mobile/orders` route (bearer-token auth) can
// place an order for an already-resolved customer, without re-deriving it
// from a cookie. `returnUrl` is only supplied by the mobile app (its own
// deep-link back into the app, same idea as the Google login flow) — when
// omitted (the web checkout's own call site), no DOKU session is created
// and behavior is unchanged from before payments existed.
// GeoJSON shape Frappe's Geolocation field expects — matches how
// Outlet.lokasi is stored (see outlets.ts's parseLokasi).
function toGeoJsonPoint(lat: number, lng: number): string {
  return JSON.stringify({
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [lng, lat] } }],
  });
}

export async function submitOrder(
  customer: Customer | null,
  items: OrderLine[],
  note?: string,
  returnUrl?: string,
  outletCode?: string,
  deliveryCoords?: { latitude: number; longitude: number },
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
        // "Shopping Cart" triggers the webshop app's validation that every
        // line item has a Website Item record — almost nothing in the
        // catalog does (only 3 of the whole catalog, checked directly
        // against production), so that order_type made checkout fail to
        // record in ERPNext for virtually every real order. "Sales" is
        // ERPNext's own plain default and has no such requirement.
        order_type: "Sales",
        company: COMPANY,
        currency: CURRENCY,
        conversion_rate: 1,
        selling_price_list: PRICE_LIST,
        price_list_currency: CURRENCY,
        plc_conversion_rate: 1,
        items: items_,
        ...(note ? { other_charges_calculation: note } : {}),
        ...(outletCode ? { custom_outlet: outletCode } : {}),
        ...(deliveryCoords
          ? {
              custom_latitude: deliveryCoords.latitude,
              custom_longitude: deliveryCoords.longitude,
              delivery_point: toGeoJsonPoint(deliveryCoords.latitude, deliveryCoords.longitude),
            }
          : {}),
      },
    });

    const orderId = res.data.name;

    // Submitting (docstatus 0 -> 1) is required before this Quotation can
    // later be mapped into a Sales Order once DOKU confirms payment — and
    // is the normal ERPNext workflow anyway (a draft Quotation is a work-
    // in-progress record, not something staff should act on). Best-effort:
    // if this fails, the order still exists as a draft and checkout isn't
    // blocked by it.
    await erpRequest(`/api/resource/Quotation/${encodeURIComponent(orderId)}`, {
      method: "PUT",
      body: { docstatus: 1 },
    }).catch(() => {});

    if (returnUrl) {
      const total = items_.reduce((sum, line) => sum + line.rate * line.qty, 0);
      // Best-effort: a failed/unconfigured DOKU session doesn't fail the
      // whole checkout — the order is already recorded either way, the app
      // just falls back to its existing WhatsApp handoff.
      const payment = await createDokuCheckoutSession({
        invoiceNumber: orderId,
        amount: total,
        customerName: customer.name,
        customerEmail: customer.email ?? "",
        returnUrl,
      });
      if (payment.ok) return { ok: true, orderId, paymentUrl: payment.url };
      console.error(`DOKU session failed for ${orderId}: ${payment.message}`);
      return { ok: true, orderId, paymentError: payment.message };
    }

    return { ok: true, orderId };
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

// Same idea as resolveOrderDetail above, for a Quotation instead of a
// Sales Invoice — backs the item breakdown on Pesanan Saya's Belum
// Dibayar/Disiapkan/Pengiriman tabs, whose rows are still Quotations
// under the hood (only "Diterima" mixes in real Sales Invoice rows).
export async function resolveQuotationDetail(
  customer: Customer | null,
  quotationId: string,
): Promise<OrderDetail | null> {
  if (!isErpnextConfigured() || !customer) return null;

  try {
    const res = await erpRequest<{
      data: {
        name: string;
        transaction_date: string;
        status: string;
        grand_total: number;
        party_name: string;
        items: { item_code: string; item_name: string; qty: number; rate: number; amount: number; uom: string }[];
      };
    }>(`/api/resource/Quotation/${encodeURIComponent(quotationId)}`);

    const q = res.data;
    if (q.party_name !== customer.id) return null;

    return {
      id: q.name,
      date: q.transaction_date,
      status: q.status,
      total: q.grand_total,
      items: q.items.map((it) => ({
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

export type ConvertResult = { ok: true; salesOrderId: string } | { ok: false; message: string };

// Called by the DOKU notification webhook once a payment is confirmed —
// converts the (already-submitted) Quotation created at checkout into a
// submitted Sales Order, so staff see it as a real, paid order instead of
// a Quotation they'd otherwise have to action manually. Idempotent: a
// Quotation ERPNext has already converted flips its own status to
// "Ordered", which we check for up front so a duplicate/retried DOKU
// notification (their docs mention automatic retries) doesn't error out
// or create a second Sales Order for the same payment.
export async function convertQuotationToSalesOrder(quotationId: string): Promise<ConvertResult> {
  if (!isErpnextConfigured()) return { ok: false, message: "ERPNext belum dikonfigurasi." };

  try {
    const existing = await erpRequest<{
      data: {
        status: string;
        custom_sales_order: string | null;
        custom_outlet: string | null;
        custom_latitude: number | null;
        custom_longitude: number | null;
        delivery_point: string | null;
        grand_total: number;
      };
    }>(`/api/resource/Quotation/${encodeURIComponent(quotationId)}`, {
      params: {
        fields: jsonFields([
          "status",
          "custom_sales_order",
          "custom_outlet",
          "custom_latitude",
          "custom_longitude",
          "delivery_point",
          "grand_total",
        ]),
      },
    });
    // A Quotation ERPNext has already mapped into a Sales Order flips to
    // this status on its own — nothing further to do for a retried
    // notification.
    if (existing.data.status === "Ordered") {
      return { ok: true, salesOrderId: existing.data.custom_sales_order ?? "" };
    }

    // The cost center belongs to whichever outlet the customer checked out
    // against — falls back to the company's own default only for the rare
    // Quotation with no outlet on it (e.g. one created before this field
    // existed).
    let costCenter: string;
    if (existing.data.custom_outlet) {
      const outlet = await erpRequest<{ data: { cost_center: string } }>(
        `/api/resource/Outlet/${encodeURIComponent(existing.data.custom_outlet)}`,
        { params: { fields: jsonFields(["cost_center"]) } },
      );
      costCenter = outlet.data.cost_center;
    } else {
      const company = await erpRequest<{ data: { cost_center: string } }>(
        `/api/resource/Company/${encodeURIComponent(COMPANY)}`,
        { params: { fields: jsonFields(["cost_center"]) } },
      );
      costCenter = company.data.cost_center;
    }
    const deliveryDate = erpToday();

    const mapped = await erpRequest<{ message: Record<string, unknown> & { items: Record<string, unknown>[] } }>(
      "/api/method/erpnext.selling.doctype.quotation.quotation.make_sales_order",
      { params: { source_name: quotationId } },
    );

    const soDoc = {
      ...mapped.message,
      delivery_date: deliveryDate,
      cost_center: costCenter,
      // The mapper doesn't necessarily carry these custom fields over on
      // its own, so they're copied explicitly from the source Quotation.
      custom_outlet: existing.data.custom_outlet,
      custom_latitude: existing.data.custom_latitude,
      custom_longitude: existing.data.custom_longitude,
      delivery_point: existing.data.delivery_point,
      // The amount DOKU actually confirmed as paid — the Quotation's own
      // grand_total, since that's exactly what was sent to DOKU as the
      // session amount when checkout created it.
      custom_payment_amount: existing.data.grand_total,
      custom_payment_method: DOKU_PAYMENT_METHOD,
      items: mapped.message.items.map((item) => ({
        ...item,
        delivery_date: deliveryDate,
        cost_center: costCenter,
      })),
    };

    const created = await erpRequest<{ data: { name: string } }>("/api/resource/Sales Order", {
      method: "POST",
      body: soDoc,
    });

    await erpRequest(`/api/resource/Sales Order/${encodeURIComponent(created.data.name)}`, {
      method: "PUT",
      body: { docstatus: 1 },
    });

    // Records the link so resolveMyPesanan (and any retried notification,
    // via the early-return above) can find this Sales Order directly by
    // name instead of reverse-searching for it.
    await erpRequest(`/api/resource/Quotation/${encodeURIComponent(quotationId)}`, {
      method: "PUT",
      body: { custom_sales_order: created.data.name },
    }).catch(() => {});

    return { ok: true, salesOrderId: created.data.name };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

// "Pesanan Saya" (mobile) — the customer's own checkout-created orders,
// tracked through their full lifecycle (unpaid → preparing → shipping →
// completed — see the Pesanan/OrderStage doc comment in types.ts), unlike
// resolveOrders above which only shows completed in-store Sales Invoices.
export async function resolveMyPesanan(customer: Customer | null): Promise<Pesanan[]> {
  if (!isErpnextConfigured() || !customer) return [];

  const res = await erpRequest<{
    data: {
      name: string;
      transaction_date: string;
      status: string;
      grand_total: number;
      custom_sales_order: string | null;
    }[];
  }>("/api/resource/Quotation", {
    params: {
      fields: jsonFields(["name", "transaction_date", "status", "grand_total", "custom_sales_order"]),
      filters: jsonFilters([
        ["party_name", "=", customer.id],
        ["docstatus", "=", 1],
      ]),
      order_by: "creation desc",
      limit_page_length: "20",
    },
  });

  // Ordered quotations that have a linked Sales Order might also have a
  // Delivery Request staff created for that order — one batched lookup for
  // all of them, rather than one request per row.
  const salesOrderNames = res.data
    .map((q) => q.custom_sales_order)
    .filter((so): so is string => !!so);

  const deliveryStatusBySalesOrder = new Map<string, string>();
  if (salesOrderNames.length > 0) {
    const drRes = await erpRequest<{
      data: { custom_sales_order: string; delivery_status: string }[];
    }>("/api/resource/Delivery Request", {
      params: {
        fields: jsonFields(["custom_sales_order", "delivery_status"]),
        filters: jsonFilters([["custom_sales_order", "in", salesOrderNames]]),
        order_by: "creation desc",
        limit_page_length: "0",
      },
    });
    // Most recent Delivery Request per Sales Order wins (a redo/replacement
    // delivery attempt) — order_by desc + only-set-if-absent achieves that.
    for (const dr of drRes.data) {
      if (!deliveryStatusBySalesOrder.has(dr.custom_sales_order)) {
        deliveryStatusBySalesOrder.set(dr.custom_sales_order, dr.delivery_status);
      }
    }
  }

  return res.data.map((q): Pesanan => {
    const deliveryStatus = q.custom_sales_order
      ? (deliveryStatusBySalesOrder.get(q.custom_sales_order) ?? null)
      : null;

    let stage: OrderStage;
    if (q.status !== "Ordered") stage = "unpaid";
    else if (!deliveryStatus) stage = "preparing";
    else if (deliveryStatus === "Terkirim") stage = "completed";
    else stage = "shipping";

    return {
      id: q.name,
      date: q.transaction_date,
      status: q.status,
      total: q.grand_total,
      stage,
      deliveryStatus,
    };
  });
}

export type ResumePaymentResult = { ok: true; paymentUrl: string } | { ok: false; message: string };

// Creates a fresh DOKU Checkout session for an existing Quotation, for
// "Lanjutkan Pembayaran" on an order the shopper started but never paid
// for. Re-verifies ownership and current status server-side rather than
// trusting the app — an already-"Ordered" Quotation has nothing left to
// pay, and the total is recomputed from the Quotation's own saved items
// rather than trusted from the client, same reasoning as checkout itself.
export async function resumeQuotationPayment(
  customer: Customer | null,
  quotationId: string,
  returnUrl: string,
): Promise<ResumePaymentResult> {
  if (!isErpnextConfigured()) return { ok: false, message: "ERPNext belum dikonfigurasi." };
  if (!customer) return { ok: false, message: "Anda belum masuk." };

  try {
    const res = await erpRequest<{
      data: { party_name: string; status: string; grand_total: number };
    }>(`/api/resource/Quotation/${encodeURIComponent(quotationId)}`, {
      params: { fields: jsonFields(["party_name", "status", "grand_total"]) },
    });

    if (res.data.party_name !== customer.id) {
      return { ok: false, message: "Pesanan tidak ditemukan." };
    }
    if (res.data.status === "Ordered") {
      return { ok: false, message: "Pesanan ini sudah dibayar." };
    }

    const payment = await createDokuCheckoutSession({
      invoiceNumber: quotationId,
      amount: res.data.grand_total,
      customerName: customer.name,
      customerEmail: customer.email ?? "",
      returnUrl,
    });
    if (!payment.ok) {
      console.error(`DOKU resume failed for ${quotationId}: ${payment.message}`);
      return { ok: false, message: payment.message };
    }
    return { ok: true, paymentUrl: payment.url };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
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

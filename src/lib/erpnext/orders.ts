import { createServerFn } from "@tanstack/react-start";
import { getCookie, setResponseHeader } from "@tanstack/react-start/server";
import { getCurrentCustomer, SESSION_COOKIE } from "./auth";
import { ErpnextError, erpRequest, erpToday, jsonFields, jsonFilters } from "./client";
import { isErpnextConfigured } from "./config";
import { createDokuCheckoutSession, getDokuOrderStatus } from "./doku";
import { getAvailableQuantities } from "./products";
import { notifyPaymentConfirmed } from "./push";
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
      reason: "not_configured" | "not_authenticated" | "erpnext_error" | "out_of_stock";
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

// ERPNext stores timestamps in the business's own timezone (Asia/Jakarta),
// same reasoning as erpToday() in client.ts.
function erpTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

const DUPLICATE_CHECKOUT_WINDOW_MS = 10 * 60_000;

// The same customer's still-unpaid, submitted Quotation from the last few
// minutes that matches this cart exactly (same items and quantities, same
// total, same outlet and delivery point) — or null. Matching on content
// rather than a client-supplied key keeps retries safe even from older app
// versions that don't send one.
async function findRecentOpenQuotation(
  customerId: string,
  outletCode: string | undefined,
  lines: { item_code: string; qty: number; rate: number }[],
  deliveryCoords?: { latitude: number; longitude: number },
): Promise<string | null> {
  const since = erpTimestamp(new Date(Date.now() - DUPLICATE_CHECKOUT_WINDOW_MS));
  const filters: (string | number)[][] = [
    ["party_name", "=", customerId],
    ["docstatus", "=", 1],
    ["status", "=", "Open"],
    ["creation", ">=", since],
  ];
  if (outletCode) filters.push(["custom_outlet", "=", outletCode]);

  const list = await erpRequest<{
    data: { name: string; grand_total: number; custom_latitude: number | null; custom_longitude: number | null }[];
  }>("/api/resource/Quotation", {
    params: {
      fields: jsonFields(["name", "grand_total", "custom_latitude", "custom_longitude"]),
      filters: jsonFilters(filters),
      order_by: "creation desc",
      limit_page_length: "5",
    },
  });

  const total = lines.reduce((sum, line) => sum + line.rate * line.qty, 0);
  const sameSpot = (a: number | null, b: number) => a != null && Math.abs(a - b) < 1e-6;

  for (const candidate of list.data) {
    if (Math.round(candidate.grand_total) !== Math.round(total)) continue;
    if (
      deliveryCoords &&
      !(
        sameSpot(candidate.custom_latitude, deliveryCoords.latitude) &&
        sameSpot(candidate.custom_longitude, deliveryCoords.longitude)
      )
    ) {
      continue;
    }

    const doc = await erpRequest<{ data: { items: { item_code: string; qty: number }[] } }>(
      `/api/resource/Quotation/${encodeURIComponent(candidate.name)}`,
    );
    const qtyByItem = new Map<string, number>();
    for (const it of doc.data.items) {
      qtyByItem.set(it.item_code, (qtyByItem.get(it.item_code) ?? 0) + it.qty);
    }
    const wanted = new Map<string, number>();
    for (const line of lines) wanted.set(line.item_code, (wanted.get(line.item_code) ?? 0) + line.qty);

    const same =
      qtyByItem.size === wanted.size && [...wanted].every(([code, qty]) => qtyByItem.get(code) === qty);
    if (same) return candidate.name;
  }
  return null;
}

// How long an unpaid order stays visible and payable. DOKU's own payment
// link dies after an hour, but "Lanjutkan Pembayaran" mints a fresh one, so
// this is what finally retires an abandoned order (and its stale prices).
const UNPAID_EXPIRY_MS = 48 * 60 * 60_000;

// ERPNext's `creation` is "YYYY-MM-DD HH:mm:ss.ffffff" in the business's
// timezone (Asia/Jakarta, UTC+7).
function erpTimestampMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(`${value.replace(" ", "T")}+07:00`).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function isUnpaidExpired(creation: string | null | undefined, now = Date.now()): boolean {
  const created = erpTimestampMs(creation);
  return created !== null && now - created > UNPAID_EXPIRY_MS;
}

// Names of the cart lines the outlet can't cover in full, or [] when
// everything is available (or the outlet has no app warehouse to check).
async function findStockShortages(
  outletCode: string,
  lines: { item_code: string; item_name: string; qty: number }[],
): Promise<string[]> {
  const outlet = await erpRequest<{ data: { warehouse_consumer_apps: string | null } }>(
    `/api/resource/Outlet/${encodeURIComponent(outletCode)}`,
  );
  const warehouse = outlet.data.warehouse_consumer_apps;
  if (!warehouse) return [];

  const needed = new Map<string, { name: string; qty: number }>();
  for (const line of lines) {
    const entry = needed.get(line.item_code) ?? { name: line.item_name || line.item_code, qty: 0 };
    entry.qty += line.qty;
    needed.set(line.item_code, entry);
  }
  const available = await getAvailableQuantities([...needed.keys()], warehouse);
  return [...needed]
    .filter(([code, want]) => (available.get(code) ?? 0) < want.qty)
    .map(([, want]) => want.name);
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

    // The cart screen checks stock, but only the server can be trusted to:
    // an order for goods the outlet doesn't have would be paid for and then
    // can't be fulfilled. A failed lookup never blocks the order (same
    // best-effort stance as the cart's own check).
    if (outletCode) {
      const shortages = await findStockShortages(outletCode, items_).catch(() => []);
      if (shortages.length > 0) {
        return {
          ok: false,
          reason: "out_of_stock",
          message: `Stok tidak mencukupi untuk: ${shortages.join(", ")}.`,
        };
      }
    }

    // A retried checkout (timeout, double tap, flaky network) would
    // otherwise create a second Quotation and DOKU session for the same
    // cart — two things to pay. If this customer already has an identical,
    // still-unpaid order from the last few minutes, that one is reused.
    const reused = await findRecentOpenQuotation(customer.id, outletCode, items_, deliveryCoords).catch(
      () => null,
    );

    const res = reused
      ? { data: { name: reused } }
      : await erpRequest<{ data: { name: string } }>("/api/resource/Quotation", {
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
    if (!reused) {
      await erpRequest(`/api/resource/Quotation/${encodeURIComponent(orderId)}`, {
        method: "PUT",
        body: { docstatus: 1 },
      }).catch(() => {});
    }

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

  // An invoice made from an online order (its lines point back at a Sales
  // Order) is created the moment staff press "Siapkan" — long before the
  // goods arrive. Keep those out of the history until their Delivery
  // Request is "Terkirim"; plain in-store invoices have no Sales Order and
  // always show.
  const invoiceNames = res.data.map((inv) => inv.name);
  const online = new Set<string>();
  const delivered = new Set<string>();
  if (invoiceNames.length > 0) {
    const itemRes = await erpRequest<{ data: { parent: string }[] }>("/api/resource/Sales Invoice Item", {
      params: {
        parent: "Sales Invoice",
        fields: jsonFields(["parent"]),
        filters: jsonFilters([
          ["parent", "in", invoiceNames],
          ["sales_order", "is", "set"],
        ]),
        limit_page_length: "0",
      },
    });
    for (const row of itemRes.data) online.add(row.parent);

    if (online.size > 0) {
      const drRes = await erpRequest<{ data: { sales_invoice: string }[] }>("/api/resource/Delivery Request", {
        params: {
          fields: jsonFields(["sales_invoice"]),
          filters: jsonFilters([
            ["sales_invoice", "in", [...online]],
            ["delivery_status", "=", "Terkirim"],
          ]),
          limit_page_length: "0",
        },
      });
      for (const row of drRes.data) delivered.add(row.sales_invoice);
    }
  }

  return res.data
    .filter((inv) => !online.has(inv.name) || delivered.has(inv.name))
    .map((inv) => ({
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

export type ConvertResult =
  // `created` is true only when THIS call recorded the payment — a retry
  // that finds the work already done reports false, so side effects such as
  // the "payment received" push are sent exactly once.
  | { ok: true; salesOrderId: string; created: boolean; customerId: string | null }
  // `retryable` tells the DOKU webhook whether answering with an error (so
  // DOKU re-sends the notification) can ever help — false for an invoice
  // that isn't ours, was cancelled, or whose paid amount doesn't match.
  | {
      ok: false;
      message: string;
      retryable: boolean;
      reason?: "not_found" | "cancelled" | "amount_mismatch";
    };

type SalesOrderRef = { name: string; docstatus: number; creation: string };

// Every live (draft or submitted) Sales Order already made from this
// Quotation, oldest first — what makes payment confirmation safe to
// repeat: an earlier attempt's result is found and reused instead of
// being duplicated.
async function listSalesOrdersForQuotation(quotationId: string): Promise<SalesOrderRef[]> {
  const items = await erpRequest<{ data: { parent: string }[] }>("/api/resource/Sales Order Item", {
    params: {
      parent: "Sales Order",
      fields: jsonFields(["parent"]),
      filters: jsonFilters([["prevdoc_docname", "=", quotationId]]),
      limit_page_length: "0",
    },
  });
  const names = [...new Set(items.data.map((row) => row.parent))];
  if (names.length === 0) return [];

  const res = await erpRequest<{ data: SalesOrderRef[] }>("/api/resource/Sales Order", {
    params: {
      fields: jsonFields(["name", "docstatus", "creation"]),
      filters: jsonFilters([
        ["name", "in", names],
        ["docstatus", "in", [0, 1]],
      ]),
      order_by: "creation asc, name asc",
      limit_page_length: "0",
    },
  });
  return res.data;
}

// Called by the DOKU notification webhook once a payment is confirmed —
// converts the (already-submitted) Quotation created at checkout into a
// submitted Sales Order, so staff see it as a real, paid order instead of
// a Quotation they'd otherwise have to action manually.
//
// Idempotent end to end — DOKU retries notifications (and the webhook now
// asks it to retry on failure), so every step tolerates being re-run:
//  - a Quotation already "Ordered" is done;
//  - a Sales Order an earlier attempt already submitted is reused, and a
//    draft it left behind (failed before submit) is submitted rather than
//    duplicated;
//  - two attempts racing each other both create a draft, then the oldest
//    one wins and the other deletes itself, with a final check that
//    cancels any second *submitted* one — so one payment always ends as
//    exactly one Sales Order.
export async function convertQuotationToSalesOrder(
  quotationId: string,
  opts: { confirmedAmount?: number | null } = {},
): Promise<ConvertResult> {
  if (!isErpnextConfigured()) {
    return { ok: false, message: "ERPNext belum dikonfigurasi.", retryable: true };
  }

  try {
    let existing;
    try {
      existing = await erpRequest<{
        data: {
          status: string;
          docstatus: number;
          party_name: string;
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
    } catch (error) {
      // Not one of our Quotations (e.g. a DOKU test invoice) — nothing a
      // retry could ever fix.
      if (error instanceof ErpnextError && error.status === 404) {
        return {
          ok: false,
          message: `Quotation ${quotationId} tidak ditemukan.`,
          retryable: false,
          reason: "not_found",
        };
      }
      throw error;
    }

    const customerId = existing.data.party_name ?? null;

    // The customer (or staff) cancelled it before the payment landed — a
    // Sales Order can't be made from it, and no retry will change that.
    // The money is with DOKU, so the caller flags it for a manual refund.
    if (existing.data.docstatus === 2 || existing.data.status === "Cancelled") {
      return {
        ok: false,
        message: `Quotation ${quotationId} sudah dibatalkan.`,
        retryable: false,
        reason: "cancelled",
      };
    }

    // A Quotation ERPNext has already mapped into a Sales Order flips to
    // this status on its own — nothing further to do for a retried
    // notification.
    if (existing.data.status === "Ordered") {
      return {
        ok: true,
        salesOrderId: existing.data.custom_sales_order ?? "",
        created: false,
        customerId,
      };
    }

    // DOKU states what it actually collected. Less than the order's total
    // must not be booked as fully paid — and can't be fixed by retrying, so
    // it is reported, not re-sent. More than the total (a gateway fee added
    // on top) is still a fully paid order.
    if (
      opts.confirmedAmount != null &&
      Math.round(opts.confirmedAmount) < Math.round(existing.data.grand_total)
    ) {
      return {
        ok: false,
        message: `Nominal DOKU ${opts.confirmedAmount} kurang dari total pesanan ${existing.data.grand_total}.`,
        retryable: false,
        reason: "amount_mismatch",
      };
    }

    const found = await listSalesOrdersForQuotation(quotationId);
    const submittedBefore = found.find((so) => so.docstatus === 1);
    if (submittedBefore) {
      return { ok: true, salesOrderId: submittedBefore.name, created: false, customerId };
    }

    // A draft left by an earlier attempt that died before submitting.
    let salesOrderName: string | undefined = found[0]?.name;
    let created = true;

    if (!salesOrderName) {
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
      salesOrderName = created.data.name;

      // Another attempt may have created its own draft at the same moment:
      // the oldest one is the single survivor, every other one deletes
      // itself (and an already-submitted survivor means we're done).
      const afterCreate = await listSalesOrdersForQuotation(quotationId);
      const winner = afterCreate[0];
      if (winner && winner.name !== salesOrderName) {
        await erpRequest(`/api/resource/Sales Order/${encodeURIComponent(salesOrderName)}`, {
          method: "DELETE",
        }).catch(() => {});
        if (winner.docstatus === 1) {
          return { ok: true, salesOrderId: winner.name, created: false, customerId };
        }
        salesOrderName = winner.name;
      }
    }

    try {
      await erpRequest(`/api/resource/Sales Order/${encodeURIComponent(salesOrderName)}`, {
        method: "PUT",
        body: { docstatus: 1 },
      });
    } catch (error) {
      // A racing attempt may have submitted this very draft first — that
      // is success, anything else is a real failure to surface.
      const now = await listSalesOrdersForQuotation(quotationId);
      if (!now.some((so) => so.name === salesOrderName && so.docstatus === 1)) throw error;
      created = false;
    }

    // Last guard for the narrow window where two attempts each submitted
    // their own draft: keep the oldest submitted Sales Order, cancel ours
    // if it's the later one.
    const submitted = (await listSalesOrdersForQuotation(quotationId)).filter((so) => so.docstatus === 1);
    if (submitted.length > 1 && submitted[0].name !== salesOrderName) {
      await erpRequest(`/api/resource/Sales Order/${encodeURIComponent(salesOrderName)}`, {
        method: "PUT",
        body: { docstatus: 2 },
      }).catch(() => {});
      salesOrderName = submitted[0].name;
      created = false;
    }

    // Records the link so resolveMyPesanan (and any retried notification,
    // via the early-return above) can find this Sales Order directly by
    // name instead of reverse-searching for it.
    await erpRequest(`/api/resource/Quotation/${encodeURIComponent(quotationId)}`, {
      method: "PUT",
      body: { custom_sales_order: salesOrderName },
    }).catch(() => {});

    return { ok: true, salesOrderId: salesOrderName, created, customerId };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
      retryable: true,
    };
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
      creation: string;
    }[];
  }>("/api/resource/Quotation", {
    params: {
      fields: jsonFields(["name", "transaction_date", "status", "grand_total", "custom_sales_order", "creation"]),
      filters: jsonFilters([
        ["party_name", "=", customer.id],
        ["docstatus", "=", 1],
      ]),
      order_by: "creation desc",
      limit_page_length: "20",
    },
  });

  // An order that was never paid stops being offered after a while: its
  // price is stale and nobody is waiting on it. Paid orders always stay.
  res.data = res.data.filter((q) => q.status === "Ordered" || !isUnpaidExpired(q.creation));

  // An Ordered quotation's delivery progress lives on a Delivery Request,
  // which ERPNext only links to the *Sales Invoice* staff create from the
  // Sales Order (Delivery Request.sales_invoice) — there is no direct
  // Delivery Request -> Sales Order field. So the chain is walked with the
  // standard ERPNext links, one batched lookup per hop instead of one per
  // row: Quotation -> Sales Order (Sales Order Item.prevdoc_docname) ->
  // Sales Invoice (Sales Invoice Item.sales_order) -> Delivery Request.
  // Quotation.custom_sales_order is only a hint: it can't be written after
  // submit, so it's usually empty and must not be relied on.
  const orderedQuotations = res.data.filter((q) => q.status === "Ordered").map((q) => q.name);

  const salesOrderByQuotation = new Map<string, string>();
  for (const q of res.data) {
    if (q.custom_sales_order) salesOrderByQuotation.set(q.name, q.custom_sales_order);
  }
  const unlinked = orderedQuotations.filter((name) => !salesOrderByQuotation.has(name));
  if (unlinked.length > 0) {
    const soRes = await erpRequest<{ data: { parent: string; prevdoc_docname: string }[] }>(
      "/api/resource/Sales Order Item",
      {
        params: {
          parent: "Sales Order",
          fields: jsonFields(["parent", "prevdoc_docname"]),
          filters: jsonFilters([["prevdoc_docname", "in", unlinked]]),
          limit_page_length: "0",
        },
      },
    );
    for (const row of soRes.data) {
      if (!salesOrderByQuotation.has(row.prevdoc_docname)) {
        salesOrderByQuotation.set(row.prevdoc_docname, row.parent);
      }
    }
  }

  const salesOrderNames = [...new Set(salesOrderByQuotation.values())];
  const invoicesBySalesOrder = new Map<string, Set<string>>();
  if (salesOrderNames.length > 0) {
    const siRes = await erpRequest<{ data: { parent: string; sales_order: string }[] }>(
      "/api/resource/Sales Invoice Item",
      {
        params: {
          parent: "Sales Invoice",
          fields: jsonFields(["parent", "sales_order"]),
          filters: jsonFilters([["sales_order", "in", salesOrderNames]]),
          limit_page_length: "0",
        },
      },
    );
    // Child-table rows carry no parent docstatus, so cancelled invoices
    // (e.g. one staff voided and re-issued) are dropped with one more
    // lookup — otherwise a cancelled invoice would still count as "the"
    // invoice of its order.
    const candidates = [...new Set(siRes.data.map((row) => row.parent))];
    const live = new Set<string>();
    if (candidates.length > 0) {
      const liveRes = await erpRequest<{ data: { name: string }[] }>("/api/resource/Sales Invoice", {
        params: {
          fields: jsonFields(["name"]),
          filters: jsonFilters([
            ["name", "in", candidates],
            ["docstatus", "=", 1],
          ]),
          limit_page_length: "0",
        },
      });
      for (const row of liveRes.data) live.add(row.name);
    }
    for (const row of siRes.data) {
      if (!live.has(row.parent)) continue;
      const set = invoicesBySalesOrder.get(row.sales_order) ?? new Set<string>();
      set.add(row.parent);
      invoicesBySalesOrder.set(row.sales_order, set);
    }
  }

  const invoiceNames = [...new Set([...invoicesBySalesOrder.values()].flatMap((s) => [...s]))];
  let deliveryRequests: { sales_invoice: string; delivery_status: string }[] = [];
  if (invoiceNames.length > 0) {
    const drRes = await erpRequest<{
      data: { sales_invoice: string; delivery_status: string }[];
    }>("/api/resource/Delivery Request", {
      params: {
        fields: jsonFields(["sales_invoice", "delivery_status"]),
        filters: jsonFilters([["sales_invoice", "in", invoiceNames]]),
        order_by: "creation desc",
        limit_page_length: "0",
      },
    });
    // Newest first, so the most recent Delivery Request for an order wins
    // (a redo/replacement delivery attempt).
    deliveryRequests = drRes.data;
  }

  const deliveryForQuotation = (quotation: string) => {
    const salesOrder = salesOrderByQuotation.get(quotation);
    const invoices = salesOrder ? invoicesBySalesOrder.get(salesOrder) : undefined;
    if (!invoices) return null;
    return deliveryRequests.find((dr) => invoices.has(dr.sales_invoice)) ?? null;
  };

  return res.data.map((q): Pesanan => {
    const delivery = deliveryForQuotation(q.name);
    const deliveryStatus = delivery?.delivery_status ?? null;
    const salesOrderId = salesOrderByQuotation.get(q.name) ?? null;

    let stage: OrderStage;
    if (q.status !== "Ordered") stage = "unpaid";
    else if (!deliveryStatus) stage = "preparing";
    else if (deliveryStatus === "Terkirim") stage = "completed";
    else stage = "shipping";

    // The document number the customer sees follows the order's real
    // paperwork: Quotation while unpaid, Sales Order while it's being
    // prepared/shipped, and the Sales Invoice once it has been delivered.
    // `id` stays the Quotation — it's the stable key the detail and
    // resume-payment endpoints resolve the order by.
    const invoiceId = stage === "completed" ? (delivery?.sales_invoice ?? null) : null;
    let displayId = q.name;
    if (stage === "completed") displayId = invoiceId ?? salesOrderId ?? q.name;
    else if (stage !== "unpaid") displayId = salesOrderId ?? q.name;

    return {
      id: q.name,
      displayId,
      salesOrderId,
      invoiceId,
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
      data: { party_name: string; status: string; grand_total: number; creation: string };
    }>(`/api/resource/Quotation/${encodeURIComponent(quotationId)}`, {
      params: { fields: jsonFields(["party_name", "status", "grand_total", "creation"]) },
    });

    if (res.data.party_name !== customer.id) {
      return { ok: false, message: "Pesanan tidak ditemukan." };
    }
    if (res.data.status === "Ordered") {
      return { ok: false, message: "Pesanan ini sudah dibayar." };
    }
    if (isUnpaidExpired(res.data.creation)) {
      return {
        ok: false,
        message: "Pesanan ini sudah kedaluwarsa. Silakan buat pesanan baru dari keranjang.",
      };
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

// ---------------------------------------------------------------------
// Cancelling an unpaid order, payment verification, reconciliation
// ---------------------------------------------------------------------

export type CancelResult = { ok: true } | { ok: false; message: string };

// The customer gives up on an order they haven't paid for. Only a
// Quotation that hasn't turned into a Sales Order can be cancelled here —
// once paid, taking it back is a refund, which staff handle.
export async function cancelQuotation(
  customer: Customer | null,
  quotationId: string,
): Promise<CancelResult> {
  if (!isErpnextConfigured()) return { ok: false, message: "ERPNext belum dikonfigurasi." };
  if (!customer) return { ok: false, message: "Anda belum masuk." };

  try {
    const res = await erpRequest<{
      data: { party_name: string; status: string; docstatus: number };
    }>(`/api/resource/Quotation/${encodeURIComponent(quotationId)}`);

    if (res.data.party_name !== customer.id) {
      return { ok: false, message: "Pesanan tidak ditemukan." };
    }
    if (res.data.docstatus === 2) return { ok: true };

    const live = await listSalesOrdersForQuotation(quotationId);
    if (res.data.status === "Ordered" || live.length > 0) {
      return {
        ok: false,
        message: "Pesanan ini sudah dibayar dan tidak bisa dibatalkan dari aplikasi. Hubungi kami lewat WhatsApp.",
      };
    }

    await erpRequest(`/api/resource/Quotation/${encodeURIComponent(quotationId)}`, {
      method: "PUT",
      body: { docstatus: 2 },
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

// A note on the Quotation itself, where staff will see it — used when a
// payment can't be booked automatically and needs a person.
async function addQuotationComment(quotationId: string, content: string): Promise<void> {
  await erpRequest("/api/resource/Comment", {
    method: "POST",
    body: {
      comment_type: "Comment",
      reference_doctype: "Quotation",
      reference_name: quotationId,
      content,
    },
  }).catch(() => {});
}

// What the DOKU webhook does with a conversion that failed for good
// (cancelled order, mismatched amount): make it visible, since DOKU has
// already taken the customer's money.
export async function flagUnbookablePayment(quotationId: string, result: ConvertResult): Promise<void> {
  if (result.ok) return;
  if (result.reason !== "cancelled" && result.reason !== "amount_mismatch") return;
  const why =
    result.reason === "cancelled"
      ? "Pembayaran DOKU diterima untuk pesanan yang sudah dibatalkan. Perlu refund manual."
      : `Pembayaran DOKU tidak dicatat otomatis: ${result.message} Periksa dan proses manual.`;
  await addQuotationComment(quotationId, why);
}

// Books a paid order and sends the one "payment received" push.
export async function bookPaidQuotation(quotationId: string, confirmedAmount: number | null): Promise<ConvertResult> {
  const result = await convertQuotationToSalesOrder(quotationId, { confirmedAmount });
  if (result.ok && result.created && result.customerId) {
    await notifyPaymentConfirmed(result.customerId, quotationId, result.salesOrderId);
  } else if (!result.ok) {
    await flagUnbookablePayment(quotationId, result);
  }
  return result;
}

export type VerifyPaymentResult = { ok: true; paid: boolean } | { ok: false; message: string };

// The customer just came back from the payment page and the webhook hasn't
// landed yet (or never will): ask DOKU directly and book the order if it
// was paid. Safe to call repeatedly — conversion is idempotent.
export async function verifyQuotationPayment(
  customer: Customer | null,
  quotationId: string,
): Promise<VerifyPaymentResult> {
  if (!isErpnextConfigured()) return { ok: false, message: "ERPNext belum dikonfigurasi." };
  if (!customer) return { ok: false, message: "Anda belum masuk." };

  try {
    const q = await erpRequest<{ data: { party_name: string; status: string } }>(
      `/api/resource/Quotation/${encodeURIComponent(quotationId)}`,
    );
    if (q.data.party_name !== customer.id) return { ok: false, message: "Pesanan tidak ditemukan." };
    if (q.data.status === "Ordered") return { ok: true, paid: true };

    const status = await getDokuOrderStatus(quotationId);
    if (!status.ok) return { ok: false, message: status.message };
    if (status.status !== "SUCCESS") return { ok: true, paid: false };

    const booked = await bookPaidQuotation(quotationId, status.amount);
    return booked.ok ? { ok: true, paid: true } : { ok: false, message: booked.message };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

export type ReconcileSummary = {
  checked: number;
  booked: string[];
  stillUnpaid: number;
  problems: { quotation: string; message: string }[];
};

// Run on a schedule (see /api/internal/reconcile-payments): recent orders
// still unpaid in ERPNext are checked against DOKU, and any DOKU says were
// paid get booked — so a lost webhook is repaired within minutes instead of
// waiting for someone to notice.
export async function reconcilePendingPayments(): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = { checked: 0, booked: [], stillUnpaid: 0, problems: [] };
  if (!isErpnextConfigured()) return summary;

  const now = Date.now();
  // Younger than a few minutes may simply not have been paid/notified yet.
  const newest = erpTimestamp(new Date(now - 3 * 60_000));
  const oldest = erpTimestamp(new Date(now - 24 * 60 * 60_000));

  const list = await erpRequest<{ data: { name: string }[] }>("/api/resource/Quotation", {
    params: {
      fields: jsonFields(["name"]),
      filters: jsonFilters([
        ["docstatus", "=", 1],
        ["status", "=", "Open"],
        ["creation", ">=", oldest],
        ["creation", "<=", newest],
      ]),
      order_by: "creation desc",
      limit_page_length: "30",
    },
  });

  // One at a time on purpose: this is a background sweep and must not
  // compete with customer traffic for DOKU's and ERPNext's capacity.
  for (const { name } of list.data) {
    summary.checked += 1;
    const status = await getDokuOrderStatus(name);
    if (!status.ok) {
      summary.problems.push({ quotation: name, message: status.message });
      continue;
    }
    if (status.status !== "SUCCESS") {
      summary.stillUnpaid += 1;
      continue;
    }
    const booked = await bookPaidQuotation(name, status.amount);
    if (booked.ok) summary.booked.push(name);
    else summary.problems.push({ quotation: name, message: booked.message });
  }
  return summary;
}

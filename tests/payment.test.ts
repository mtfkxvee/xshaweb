import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------
// In-memory ERPNext. Models only what the payment code touches, including
// the behaviours that matter for correctness: a Quotation flips to
// "Ordered" when a Sales Order made from it is submitted, and
// Quotation.custom_sales_order cannot be written after submit.
// ---------------------------------------------------------------------
type FakeSO = { name: string; docstatus: 0 | 1 | 2; creation: number; quotation: string };
type FakeQuotation = {
  name: string;
  party_name: string;
  status: string;
  docstatus: number;
  grand_total: number;
  custom_outlet: string | null;
  creation: string;
  items: { item_code: string; qty: number }[];
  custom_latitude: number | null;
  custom_longitude: number | null;
};

const h = vi.hoisted(() => {
  class FakeErpError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "ErpnextError";
      this.status = status;
    }
  }
  return {
    FakeErpError,
    state: {
      quotations: new Map<string, FakeQuotation>(),
      salesOrders: [] as FakeSO[],
      comments: [] as { reference_name: string; content: string }[],
      soCounter: 0,
      clock: 1_000,
      failSubmitTimes: 0,
      pushes: [] as { customerId: string; quotationId: string; salesOrderId: string }[],
      dokuStatus: { ok: true, status: "SUCCESS", amount: 300 } as
        | { ok: true; status: string | null; amount: number | null }
        | { ok: false; message: string },
      available: new Map<string, number>(),
      stockLookupFails: false,
      quotationCounter: 100,
    },
  };
});
const { state } = h;

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const chain: Record<string, unknown> = {};
    chain.validator = () => chain;
    chain.handler = () => () => undefined;
    return chain;
  },
}));
vi.mock("@tanstack/react-start/server", () => ({
  getCookie: () => undefined,
  setResponseHeader: () => undefined,
}));
vi.mock("../src/lib/erpnext/auth", () => ({ getCurrentCustomer: async () => null, SESSION_COOKIE: "sid" }));
vi.mock("../src/lib/erpnext/config", () => ({
  isErpnextConfigured: () => true,
  getErpnextConfig: () => ({ url: "https://erp.test", apiKey: "k", apiSecret: "s" }),
  getDokuConfig: () => ({ clientId: "c", secretKey: "s", baseUrl: "https://doku.test" }),
}));
vi.mock("../src/lib/erpnext/doku", () => ({
  createDokuCheckoutSession: async () => ({ ok: true, url: "https://pay.test/x", sessionId: "s1" }),
  getDokuOrderStatus: async () => state.dokuStatus,
}));
vi.mock("../src/lib/erpnext/products", () => ({
  getAvailableQuantities: async () => {
    if (state.stockLookupFails) throw new Error("lookup failed");
    return state.available;
  },
}));
vi.mock("../src/lib/erpnext/push", () => ({
  notifyPaymentConfirmed: async (customerId: string, quotationId: string, salesOrderId: string) => {
    state.pushes.push({ customerId, quotationId, salesOrderId });
  },
}));

vi.mock("../src/lib/erpnext/client", () => {
  const { FakeErpError, state: s } = h;
  const jf = (f: string[]) => JSON.stringify(f);
  const parse = (v: string | undefined) => (v ? (JSON.parse(v) as unknown[][]) : []);
  const liveSOs = (q: string) => s.salesOrders.filter((so) => so.quotation === q);

  async function erpRequest(
    path: string,
    opts: { method?: string; params?: Record<string, string>; body?: Record<string, unknown> } = {},
  ) {
    const method = opts.method ?? "GET";
    const p = decodeURIComponent(path);
    const params = opts.params ?? {};

    // ---- Quotation (single doc)
    let m = p.match(/^\/api\/resource\/Quotation\/([^/]+)$/);
    if (m) {
      const q = s.quotations.get(m[1]);
      if (!q) throw new FakeErpError("Not found", 404);
      if (method === "GET") return { data: { ...q, custom_sales_order: null } };
      if (method === "PUT") {
        const body = opts.body ?? {};
        if ("custom_sales_order" in body && q.docstatus === 1) {
          throw new FakeErpError("Cannot edit submitted document", 417);
        }
        if (body.docstatus === 1) q.docstatus = 1;
        if (body.docstatus === 2) {
          q.docstatus = 2;
          q.status = "Cancelled";
        }
        return { data: q };
      }
    }

    // ---- Quotation list (duplicate-checkout lookup)
    if (p === "/api/resource/Quotation" && method === "GET") {
      const filters = parse(params.filters);
      const want = (field: string) => filters.find((f) => f[0] === field)?.[2];
      const party = want("party_name");
      const outlet = want("custom_outlet");
      const rows = [...s.quotations.values()].filter(
        (q) =>
          q.docstatus === 1 &&
          q.status === "Open" &&
          (!party || q.party_name === party) &&
          (!outlet || q.custom_outlet === outlet),
      );
      return { data: rows };
    }
    if (p === "/api/resource/Quotation" && method === "POST") {
      const body = opts.body as Record<string, unknown>;
      const name = `SAL-QTN-${++s.quotationCounter}`;
      s.quotations.set(name, {
        name,
        party_name: body.party_name as string,
        status: "Open",
        docstatus: 0,
        grand_total: (body.items as { rate: number; qty: number }[]).reduce((t, i) => t + i.rate * i.qty, 0),
        custom_outlet: (body.custom_outlet as string) ?? null,
        creation: "2026-10-14 10:00:00.000000",
        items: (body.items as { item_code: string; qty: number }[]).map((i) => ({
          item_code: i.item_code,
          qty: i.qty,
        })),
        custom_latitude: null,
        custom_longitude: null,
      });
      return { data: { name } };
    }

    // ---- Item master
    m = p.match(/^\/api\/resource\/Item\/([^/]+)$/);
    if (m) return { data: { stock_uom: "Nos", standard_rate: 100 } };

    // ---- Outlet / Company
    m = p.match(/^\/api\/resource\/Outlet\/([^/]+)$/);
    if (m) return { data: { cost_center: "CC - X", warehouse_consumer_apps: "WH - X" } };
    if (/^\/api\/resource\/Company\//.test(p)) return { data: { cost_center: "CC - X" } };

    // ---- Sales Order Item (links SO -> quotation)
    if (p === "/api/resource/Sales Order Item") {
      const q = parse(params.filters)[0]?.[2] as string;
      return { data: liveSOs(q).map((so) => ({ parent: so.name })) };
    }

    // ---- Sales Order list / create / update / delete
    if (p === "/api/resource/Sales Order" && method === "GET") {
      const filters = parse(params.filters);
      const names = (filters.find((f) => f[0] === "name")?.[2] as string[]) ?? [];
      const rows = s.salesOrders
        .filter((so) => names.includes(so.name) && so.docstatus !== 2)
        .sort((a, b) => a.creation - b.creation || a.name.localeCompare(b.name))
        .map((so) => ({ name: so.name, docstatus: so.docstatus, creation: String(so.creation) }));
      return { data: rows };
    }
    if (p === "/api/resource/Sales Order" && method === "POST") {
      const name = `SAL-ORD-${++s.soCounter}`;
      const quotation = (opts.body?.items as { prevdoc_docname?: string }[])[0]?.prevdoc_docname ?? "";
      s.salesOrders.push({ name, docstatus: 0, creation: ++s.clock, quotation });
      return { data: { name } };
    }
    m = p.match(/^\/api\/resource\/Sales Order\/([^/]+)$/);
    if (m) {
      const so = s.salesOrders.find((x) => x.name === m![1]);
      if (method === "DELETE") {
        s.salesOrders = s.salesOrders.filter((x) => x.name !== m![1]);
        return { data: "ok" };
      }
      if (!so) throw new FakeErpError("Not found", 404);
      if (method === "PUT") {
        if (opts.body?.docstatus === 1) {
          if (so.docstatus === 1) throw new FakeErpError("Already submitted", 417);
          if (s.failSubmitTimes > 0) {
            s.failSubmitTimes -= 1;
            throw new FakeErpError("Submit failed", 500);
          }
          so.docstatus = 1;
          const q = s.quotations.get(so.quotation);
          if (q) q.status = "Ordered";
        }
        if (opts.body?.docstatus === 2) so.docstatus = 2;
        return { data: so };
      }
    }

    // ---- mapper
    if (p.endsWith("quotation.make_sales_order")) {
      const q = params.source_name;
      return { message: { items: [{ item_code: "A", prevdoc_docname: q }] } };
    }

    // ---- comments
    if (p === "/api/resource/Comment" && method === "POST") {
      s.comments.push({
        reference_name: opts.body?.reference_name as string,
        content: opts.body?.content as string,
      });
      return { data: {} };
    }

    throw new Error(`fake ERP: unhandled ${method} ${path}`);
  }

  return {
    ErpnextError: FakeErpError,
    erpRequest,
    erpToday: () => "2026-10-14",
    jsonFields: jf,
    jsonFilters: (f: unknown[]) => JSON.stringify(f),
  };
});

import {
  cancelQuotation,
  convertQuotationToSalesOrder,
  isUnpaidExpired,
  reconcilePendingPayments,
  submitOrder,
  verifyQuotationPayment,
} from "../src/lib/erpnext/orders";
import { handleDokuNotification } from "../src/lib/erpnext/payment-webhook";

const customer = {
  id: "WX1",
  name: "Tester",
  email: "t@x.id",
  mobile: null,
  group: null,
  loyaltyProgram: null,
  birthDate: null,
  kodePelanggan: null,
};

function addQuotation(name: string, overrides: Partial<FakeQuotation> = {}): FakeQuotation {
  const q: FakeQuotation = {
    name,
    party_name: "WX1",
    status: "Open",
    docstatus: 1,
    grand_total: 300,
    custom_outlet: "XSP",
    creation: "2026-10-14 10:00:00.000000",
    items: [{ item_code: "A", qty: 1 }],
    custom_latitude: null,
    custom_longitude: null,
    ...overrides,
  };
  state.quotations.set(name, q);
  return q;
}

const liveSubmitted = () => state.salesOrders.filter((so) => so.docstatus === 1);
const liveAny = () => state.salesOrders.filter((so) => so.docstatus !== 2);

beforeEach(() => {
  state.quotations.clear();
  state.salesOrders = [];
  state.comments = [];
  state.pushes = [];
  state.soCounter = 0;
  state.clock = 1_000;
  state.failSubmitTimes = 0;
  state.dokuStatus = { ok: true, status: "SUCCESS", amount: 300 };
  state.available = new Map();
  state.stockLookupFails = false;
  state.quotationCounter = 100;
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("convertQuotationToSalesOrder (idempotent payment booking)", () => {
  it("books a paid Quotation as exactly one submitted Sales Order", async () => {
    addQuotation("Q1");
    const r = await convertQuotationToSalesOrder("Q1");
    expect(r).toMatchObject({ ok: true, created: true, customerId: "WX1" });
    expect(liveSubmitted()).toHaveLength(1);
    expect(state.quotations.get("Q1")?.status).toBe("Ordered");
  });

  it("a retried notification finds the work done and creates nothing", async () => {
    addQuotation("Q1");
    await convertQuotationToSalesOrder("Q1");
    const again = await convertQuotationToSalesOrder("Q1");
    expect(again).toMatchObject({ ok: true, created: false });
    expect(liveAny()).toHaveLength(1);
  });

  it("two notifications at the same moment still yield one Sales Order", async () => {
    addQuotation("Q1");
    const [a, b] = await Promise.all([
      convertQuotationToSalesOrder("Q1"),
      convertQuotationToSalesOrder("Q1"),
    ]);
    expect(a.ok && b.ok).toBe(true);
    expect(liveSubmitted()).toHaveLength(1);
    expect(liveAny()).toHaveLength(1);
    // The payment is announced to the customer at most once.
    const created = [a, b].filter((r) => r.ok && r.created);
    expect(created.length).toBeLessThanOrEqual(1);
  });

  it("a failed submit leaves a draft that the retry submits (no second order)", async () => {
    addQuotation("Q1");
    state.failSubmitTimes = 1;
    const first = await convertQuotationToSalesOrder("Q1");
    expect(first).toMatchObject({ ok: false, retryable: true });
    expect(liveAny()).toHaveLength(1); // the draft

    const retry = await convertQuotationToSalesOrder("Q1");
    expect(retry.ok).toBe(true);
    expect(liveSubmitted()).toHaveLength(1);
    expect(liveAny()).toHaveLength(1);
  });

  it("refuses an amount below the order total and books nothing", async () => {
    addQuotation("Q1", { grand_total: 300 });
    const r = await convertQuotationToSalesOrder("Q1", { confirmedAmount: 250 });
    expect(r).toMatchObject({ ok: false, retryable: false, reason: "amount_mismatch" });
    expect(liveAny()).toHaveLength(0);
  });

  it("accepts the matching amount", async () => {
    addQuotation("Q1", { grand_total: 300 });
    const r = await convertQuotationToSalesOrder("Q1", { confirmedAmount: 300 });
    expect(r.ok).toBe(true);
  });

  it("still books when DOKU collected more than the total (e.g. a fee on top)", async () => {
    addQuotation("Q1", { grand_total: 300 });
    const r = await convertQuotationToSalesOrder("Q1", { confirmedAmount: 305 });
    expect(r.ok).toBe(true);
    expect(liveSubmitted()).toHaveLength(1);
  });

  it("does not book a cancelled Quotation, and says retrying is pointless", async () => {
    addQuotation("Q1", { docstatus: 2, status: "Cancelled" });
    const r = await convertQuotationToSalesOrder("Q1");
    expect(r).toMatchObject({ ok: false, retryable: false, reason: "cancelled" });
    expect(liveAny()).toHaveLength(0);
  });

  it("an unknown invoice is not retryable", async () => {
    const r = await convertQuotationToSalesOrder("NOPE");
    expect(r).toMatchObject({ ok: false, retryable: false, reason: "not_found" });
  });
});

describe("handleDokuNotification (what DOKU is told)", () => {
  it("ignores notifications that are not SUCCESS", async () => {
    addQuotation("Q1");
    const r = await handleDokuNotification({
      transaction: { status: "FAILED" },
      order: { invoice_number: "Q1", amount: 300 },
    });
    expect(r.retry).toBe(false);
    expect(liveAny()).toHaveLength(0);
  });

  it("books a SUCCESS payment, acknowledges it, and pushes exactly once across repeats", async () => {
    addQuotation("Q1");
    const note = { transaction: { status: "SUCCESS" }, order: { invoice_number: "Q1", amount: 300 } };
    expect((await handleDokuNotification(note)).retry).toBe(false);
    expect((await handleDokuNotification(note)).retry).toBe(false);
    expect((await handleDokuNotification(note)).retry).toBe(false);
    expect(liveSubmitted()).toHaveLength(1);
    expect(state.pushes).toHaveLength(1);
    expect(state.pushes[0]).toMatchObject({ customerId: "WX1", quotationId: "Q1" });
  });

  it("asks DOKU to retry when recording fails", async () => {
    addQuotation("Q1");
    state.failSubmitTimes = 1;
    const r = await handleDokuNotification({
      transaction: { status: "SUCCESS" },
      order: { invoice_number: "Q1", amount: 300 },
    });
    expect(r.retry).toBe(true);
    expect(state.pushes).toHaveLength(0);
  });

  it("does not retry (and flags the order) when the amount differs", async () => {
    addQuotation("Q1", { grand_total: 300 });
    const r = await handleDokuNotification({
      transaction: { status: "SUCCESS" },
      order: { invoice_number: "Q1", amount: 1 },
    });
    expect(r.retry).toBe(false);
    expect(liveAny()).toHaveLength(0);
    expect(state.comments).toHaveLength(1);
    expect(state.comments[0].reference_name).toBe("Q1");
  });

  it("flags a payment that arrives for an already-cancelled order", async () => {
    addQuotation("Q1", { docstatus: 2, status: "Cancelled" });
    const r = await handleDokuNotification({
      transaction: { status: "SUCCESS" },
      order: { invoice_number: "Q1", amount: 300 },
    });
    expect(r.retry).toBe(false);
    expect(state.comments[0].content).toMatch(/refund/i);
  });

  it("acknowledges an invoice that is not ours without retrying", async () => {
    const r = await handleDokuNotification({
      transaction: { status: "SUCCESS" },
      order: { invoice_number: "SOMETHING-ELSE", amount: 5 },
    });
    expect(r.retry).toBe(false);
  });

  it("books when DOKU sends no amount (nothing to compare)", async () => {
    addQuotation("Q1");
    const r = await handleDokuNotification({
      transaction: { status: "SUCCESS" },
      order: { invoice_number: "Q1" },
    });
    expect(r.retry).toBe(false);
    expect(liveSubmitted()).toHaveLength(1);
  });
});

describe("verifyQuotationPayment (status-check fallback)", () => {
  it("books the order when DOKU says it was paid", async () => {
    addQuotation("Q1");
    const r = await verifyQuotationPayment(customer, "Q1");
    expect(r).toEqual({ ok: true, paid: true });
    expect(liveSubmitted()).toHaveLength(1);
    expect(state.pushes).toHaveLength(1);
  });

  it("leaves it unpaid when DOKU says pending", async () => {
    addQuotation("Q1");
    state.dokuStatus = { ok: true, status: "PENDING", amount: null };
    expect(await verifyQuotationPayment(customer, "Q1")).toEqual({ ok: true, paid: false });
    expect(liveAny()).toHaveLength(0);
  });

  it("never reveals another customer's order", async () => {
    addQuotation("Q1", { party_name: "SOMEONE-ELSE" });
    const r = await verifyQuotationPayment(customer, "Q1");
    expect(r.ok).toBe(false);
    expect(liveAny()).toHaveLength(0);
  });

  it("reports a DOKU outage without changing anything", async () => {
    addQuotation("Q1");
    state.dokuStatus = { ok: false, message: "timeout" };
    const r = await verifyQuotationPayment(customer, "Q1");
    expect(r.ok).toBe(false);
    expect(liveAny()).toHaveLength(0);
  });
});

describe("reconcilePendingPayments", () => {
  it("books recent unpaid orders DOKU reports as paid", async () => {
    addQuotation("Q1");
    addQuotation("Q2");
    state.dokuStatus = { ok: true, status: "SUCCESS", amount: 300 };
    const summary = await reconcilePendingPayments();
    expect(summary.checked).toBe(2);
    expect(summary.booked.sort()).toEqual(["Q1", "Q2"]);
    expect(liveSubmitted()).toHaveLength(2);
  });

  it("leaves genuinely unpaid orders alone", async () => {
    addQuotation("Q1");
    state.dokuStatus = { ok: true, status: null, amount: null };
    const summary = await reconcilePendingPayments();
    expect(summary).toMatchObject({ checked: 1, stillUnpaid: 1, booked: [] });
    expect(liveAny()).toHaveLength(0);
  });
});

describe("cancelQuotation", () => {
  it("cancels an unpaid order", async () => {
    addQuotation("Q1");
    expect(await cancelQuotation(customer, "Q1")).toEqual({ ok: true });
    expect(state.quotations.get("Q1")?.docstatus).toBe(2);
  });

  it("refuses an order that is already paid", async () => {
    addQuotation("Q1");
    await convertQuotationToSalesOrder("Q1");
    const r = await cancelQuotation(customer, "Q1");
    expect(r.ok).toBe(false);
    expect(state.quotations.get("Q1")?.docstatus).toBe(1);
  });

  it("refuses someone else's order", async () => {
    addQuotation("Q1", { party_name: "OTHER" });
    expect((await cancelQuotation(customer, "Q1")).ok).toBe(false);
    expect(state.quotations.get("Q1")?.docstatus).toBe(1);
  });

  it("is safe to repeat", async () => {
    addQuotation("Q1");
    await cancelQuotation(customer, "Q1");
    expect(await cancelQuotation(customer, "Q1")).toEqual({ ok: true });
  });
});

describe("isUnpaidExpired", () => {
  const now = new Date("2026-10-14T10:00:00+07:00").getTime();
  it("keeps a recent order", () => {
    expect(isUnpaidExpired("2026-10-14 08:00:00.000000", now)).toBe(false);
  });
  it("keeps one just inside 48 hours", () => {
    expect(isUnpaidExpired("2026-10-12 10:30:00.000000", now)).toBe(false);
  });
  it("expires one past 48 hours", () => {
    expect(isUnpaidExpired("2026-10-12 09:00:00.000000", now)).toBe(true);
  });
  it("never expires on a missing or garbled date", () => {
    expect(isUnpaidExpired(undefined, now)).toBe(false);
    expect(isUnpaidExpired("not a date", now)).toBe(false);
  });
});

describe("submitOrder (server-side stock check and duplicate guard)", () => {
  const lines = [{ itemCode: "A", itemName: "Barang A", qty: 2, rate: 999 }];

  it("rejects an order the outlet cannot cover, before anything is created", async () => {
    state.available = new Map([["A", 1]]);
    const r = await submitOrder(customer, lines, "note", undefined, "XSP");
    expect(r).toMatchObject({ ok: false, reason: "out_of_stock" });
    expect(state.quotations.size).toBe(0);
  });

  it("accepts an order the outlet can cover", async () => {
    state.available = new Map([["A", 5]]);
    const r = await submitOrder(customer, lines, "note", undefined, "XSP");
    expect(r.ok).toBe(true);
    expect(state.quotations.size).toBe(1);
  });

  it("does not block the order when the stock lookup itself fails", async () => {
    state.stockLookupFails = true;
    const r = await submitOrder(customer, lines, "note", undefined, "XSP");
    expect(r.ok).toBe(true);
  });

  it("a double submit reuses the first unpaid order instead of creating another", async () => {
    state.available = new Map([["A", 5]]);
    const first = await submitOrder(customer, lines, "note", undefined, "XSP");
    // The first one is submitted (docstatus 1) by submitOrder itself.
    const second = await submitOrder(customer, lines, "note", undefined, "XSP");
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) expect(second.orderId).toBe(first.orderId);
    expect(state.quotations.size).toBe(1);
  });
});

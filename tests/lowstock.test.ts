import { describe, expect, it, vi } from "vitest";

// products.ts registers server functions at import time; these stand-ins
// let the module load in plain Node without any real framework or network.
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
vi.mock("../src/lib/erpnext/client", () => ({
  ErpnextError: class extends Error {},
  erpRequest: async () => ({ data: [] }),
  erpToday: () => "2026-10-14",
  jsonFields: (f: string[]) => JSON.stringify(f),
  jsonFilters: (f: unknown[]) => JSON.stringify(f),
}));
vi.mock("../src/lib/erpnext/config", () => ({
  isErpnextConfigured: () => true,
  getErpnextConfig: () => ({ url: "https://erp.test", apiKey: "k", apiSecret: "s" }),
}));

import { LOW_STOCK_THRESHOLD, lowStockOf } from "../src/lib/erpnext/products";

describe("lowStockOf", () => {
  it("flags 1 through the threshold with the whole number", () => {
    for (let n = 1; n <= LOW_STOCK_THRESHOLD; n++) expect(lowStockOf(n)).toBe(n);
  });

  it("says nothing once there is comfortably enough", () => {
    expect(lowStockOf(LOW_STOCK_THRESHOLD + 1)).toBeUndefined();
    expect(lowStockOf(500)).toBeUndefined();
  });

  it("says nothing for nothing, negatives, or fractions below one unit", () => {
    expect(lowStockOf(0)).toBeUndefined();
    expect(lowStockOf(-3)).toBeUndefined();
    expect(lowStockOf(0.4)).toBeUndefined();
  });

  it("rounds a fractional quantity down", () => {
    expect(lowStockOf(2.9)).toBe(2);
  });

  it("copes with missing data", () => {
    expect(lowStockOf(null)).toBeUndefined();
    expect(lowStockOf(undefined)).toBeUndefined();
  });
});

import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { erpRequest, jsonFields, jsonFilters } from "./client";
import { isErpnextConfigured } from "./config";
import { mockOutlets } from "./mock-data";
import type { Outlet } from "./types";

// Falls back to the main customer-service WhatsApp number when an outlet
// hasn't had its own number filled in yet (Outlet.custom_whatsapp in ERPNext).
export const DEFAULT_WHATSAPP_NUMBER = "6288299633581";

function normalizeWhatsapp(raw: string | null): string {
  if (!raw) return DEFAULT_WHATSAPP_NUMBER;
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return DEFAULT_WHATSAPP_NUMBER;
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

export const getOutlets = createServerFn({ method: "GET" }).handler(async (): Promise<Outlet[]> => {
  // Outlet list/warehouse mapping rarely changes — safe to cache a few minutes.
  setResponseHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=120");

  if (!isErpnextConfigured()) return mockOutlets;

  const res = await erpRequest<{
    data: {
      kode: string;
      nama: string | null;
      city: string | null;
      teritory: string | null;
      custom_whatsapp: string | null;
      warehouse: string | null;
    }[];
  }>("/api/resource/Outlet", {
    params: {
      fields: jsonFields(["kode", "nama", "city", "teritory", "custom_whatsapp", "warehouse"]),
      filters: jsonFilters([
        ["is_active", "=", 1],
        ["tampilkan_di_website", "=", 1],
      ]),
      limit_page_length: "0",
      order_by: "nama asc",
    },
  });

  return res.data.map((o) => ({
    code: o.kode,
    name: o.nama || o.kode,
    city: o.city,
    territory: o.teritory,
    whatsapp: normalizeWhatsapp(o.custom_whatsapp),
    warehouse: o.warehouse,
  }));
});

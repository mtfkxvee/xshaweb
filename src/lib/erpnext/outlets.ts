import { createServerFn } from "@tanstack/react-start";
import { erpRequest, jsonFields, jsonFilters } from "./client";
import { isErpnextConfigured } from "./config";
import { mockOutlets } from "./mock-data";
import type { Outlet } from "./types";

export const getOutlets = createServerFn({ method: "GET" }).handler(async (): Promise<Outlet[]> => {
  if (!isErpnextConfigured()) return mockOutlets;

  const res = await erpRequest<{
    data: { kode: string; nama: string | null; city: string | null; teritory: string | null }[];
  }>("/api/resource/Outlet", {
    params: {
      fields: jsonFields(["kode", "nama", "city", "teritory"]),
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
  }));
});

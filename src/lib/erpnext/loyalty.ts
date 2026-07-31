import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { getCurrentCustomer, SESSION_COOKIE } from "./auth";
import { erpRequest, jsonFields, jsonFilters } from "./client";
import { isErpnextConfigured } from "./config";
import type { LoyaltyStatus } from "./types";

export const getMyLoyaltyStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<LoyaltyStatus | null> => {
    if (!isErpnextConfigured())
      return { points: 750, level: "Gold Member", loyaltyProgram: "MEMBER" };

    const sid = getCookie(SESSION_COOKIE);
    if (!sid) return null;

    const auth = await getCurrentCustomer();
    if (!auth?.customer) return null;

    if (!auth.customer.loyaltyProgram) {
      return { points: 0, level: auth.customer.group, loyaltyProgram: null };
    }

    const today = new Date().toISOString().slice(0, 10);
    const res = await erpRequest<{
      data: { loyalty_points: number; expiry_date: string | null }[];
    }>("/api/resource/Loyalty Point Entry", {
      sid,
      params: {
        fields: jsonFields(["loyalty_points", "expiry_date"]),
        filters: jsonFilters([["customer", "=", auth.customer.id]]),
        limit_page_length: "0",
      },
    });

    const points = res.data
      .filter((entry) => !entry.expiry_date || entry.expiry_date >= today)
      .reduce((sum, entry) => sum + entry.loyalty_points, 0);

    return { points, level: auth.customer.group, loyaltyProgram: auth.customer.loyaltyProgram };
  },
);

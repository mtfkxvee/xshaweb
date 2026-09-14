import { createServerFn } from "@tanstack/react-start";
import { getCookie, setResponseHeader } from "@tanstack/react-start/server";
import { getCurrentCustomer, SESSION_COOKIE } from "./auth";
import { erpRequest, erpToday, jsonFields, jsonFilters } from "./client";
import { isErpnextConfigured } from "./config";
import type { Customer, LoyaltyStatus } from "./types";

// Extracted so the mobile `/api/mobile/loyalty` route (bearer-token auth) can
// resolve the same balance the web account page shows, without re-deriving
// the customer from a cookie.
export async function resolveLoyaltyStatus(customer: Customer | null): Promise<LoyaltyStatus | null> {
  if (!isErpnextConfigured())
    return { points: 750, level: "Gold Member", loyaltyProgram: "MEMBER" };

  if (!customer) return null;

  if (!customer.loyaltyProgram) {
    return { points: 0, level: customer.group, loyaltyProgram: null };
  }

  const today = erpToday();
  // Reads with the admin API key, not the customer's own session — a portal
  // customer's role typically has no read permission on Loyalty Point Entry.
  const res = await erpRequest<{
    data: { loyalty_points: number; expiry_date: string | null }[];
  }>("/api/resource/Loyalty Point Entry", {
    params: {
      fields: jsonFields(["loyalty_points", "expiry_date"]),
      filters: jsonFilters([["customer", "=", customer.id]]),
      limit_page_length: "0",
    },
  });

  const points = res.data
    .filter((entry) => !entry.expiry_date || entry.expiry_date >= today)
    .reduce((sum, entry) => sum + entry.loyalty_points, 0);

  return { points, level: customer.group, loyaltyProgram: customer.loyaltyProgram };
}

export const getMyLoyaltyStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<LoyaltyStatus | null> => {
    // Per-customer balance — never cache (same fixed no-arg URL every call).
    setResponseHeader("Cache-Control", "no-store");

    if (!isErpnextConfigured()) return resolveLoyaltyStatus(null);

    const sid = getCookie(SESSION_COOKIE);
    if (!sid) return null;

    const auth = await getCurrentCustomer();
    return resolveLoyaltyStatus(auth?.customer ?? null);
  },
);

import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { erpRequest, jsonFields, jsonFilters } from "./client";
import { getErpnextConfig, isErpnextConfigured } from "./config";
import type { CurrentUser } from "./types";

export const SESSION_COOKIE = "xsha_erp_sid";

export const loginCustomer = createServerFn({ method: "POST" })
  .validator((input: { usr: string; pwd: string }) => input)
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; message: string }> => {
    const config = getErpnextConfig();
    if (!config) return { ok: false, message: "ERPNext belum dikonfigurasi." };

    const res = await fetch(`${config.url}/api/method/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ usr: data.usr, pwd: data.pwd }),
    });

    if (!res.ok) {
      return { ok: false, message: "Email atau kata sandi salah." };
    }

    const setCookieHeader = res.headers.get("set-cookie") ?? "";
    const sidMatch = setCookieHeader.match(/sid=([^;]+)/);
    if (!sidMatch || sidMatch[1] === "Guest") {
      return { ok: false, message: "Gagal memulai sesi ERPNext." };
    }

    setCookie(SESSION_COOKIE, sidMatch[1], {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return { ok: true };
  });

export const logoutCustomer = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: true }> => {
    const sid = getCookie(SESSION_COOKIE);
    const config = getErpnextConfig();
    if (sid && config) {
      await fetch(`${config.url}/api/method/logout`, {
        headers: { Cookie: `sid=${sid}` },
      }).catch(() => {});
    }
    deleteCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  },
);

export const getCurrentCustomer = createServerFn({ method: "GET" }).handler(
  async (): Promise<CurrentUser | null> => {
    const sid = getCookie(SESSION_COOKIE);
    if (!sid || !isErpnextConfigured()) return null;

    try {
      const userRes = await erpRequest<{ message: string }>(
        "/api/method/frappe.auth.get_logged_user",
        { sid },
      );
      const email = userRes.message;
      if (!email || email === "Guest") return null;

      // A logged-in Frappe user maps to a Customer through the "Portal User"
      // child table (Customer.portal_users) rather than a direct link field.
      const portalRes = await erpRequest<{ data: { parent: string }[] }>(
        "/api/resource/Portal User",
        {
          sid,
          params: {
            fields: jsonFields(["parent"]),
            filters: jsonFilters([
              ["user", "=", email],
              ["parenttype", "=", "Customer"],
            ]),
            limit_page_length: "1",
          },
        },
      );

      const customerId = portalRes.data[0]?.parent;
      if (!customerId) return { email, customer: null };

      const customerRes = await erpRequest<{
        data: {
          name: string;
          customer_name: string;
          customer_group: string | null;
          mobile_no: string | null;
          email_id: string | null;
          loyalty_program: string | null;
        };
      }>(`/api/resource/Customer/${encodeURIComponent(customerId)}`, {
        sid,
        params: {
          fields: jsonFields([
            "name",
            "customer_name",
            "customer_group",
            "mobile_no",
            "email_id",
            "loyalty_program",
          ]),
        },
      });

      const c = customerRes.data;
      return {
        email,
        customer: {
          id: c.name,
          name: c.customer_name,
          group: c.customer_group,
          mobile: c.mobile_no,
          email: c.email_id,
          loyaltyProgram: c.loyalty_program,
        },
      };
    } catch {
      return null;
    }
  },
);

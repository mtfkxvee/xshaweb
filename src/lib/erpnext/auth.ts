import { createServerFn } from "@tanstack/react-start";
import {
  deleteCookie,
  getCookie,
  getRequestProtocol,
  setCookie,
  setResponseHeader,
} from "@tanstack/react-start/server";
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

    // `secure: true` unconditionally would make browsers silently drop this
    // cookie on any non-HTTPS origin other than localhost (e.g. previewing
    // over a LAN IP), so it only follows the actual request protocol.
    setCookie(SESSION_COOKIE, sidMatch[1], {
      httpOnly: true,
      secure: getRequestProtocol() === "https",
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
    // This is a GET server function whose URL never changes (no arguments),
    // so without an explicit no-store the browser (and any intermediary)
    // happily serves a cached response from before login/logout forever —
    // the client then never learns the session state actually changed.
    setResponseHeader("Cache-Control", "no-store");

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
      // child table (Customer.portal_users). Querying "Portal User" as its
      // own resource always 403s (Frappe's check_parent_permission rejects
      // child-table list queries that aren't scoped to one known parent),
      // so instead we filter Customer directly using Frappe's child-table
      // filter form `[childDoctype, fieldname, operator, value]`, which
      // performs the join server-side and is the only combination that
      // actually returns a result via the REST API.
      const customerRes = await erpRequest<{
        data: {
          name: string;
          customer_name: string;
          customer_group: string | null;
          mobile_no: string | null;
          email_id: string | null;
          loyalty_program: string | null;
          custom_tanggal_lahir: string | null;
        }[];
      }>("/api/resource/Customer", {
        params: {
          fields: jsonFields([
            "name",
            "customer_name",
            "customer_group",
            "mobile_no",
            "email_id",
            "loyalty_program",
            "custom_tanggal_lahir",
          ]),
          filters: jsonFilters([["Portal User", "user", "=", email]]),
          limit_page_length: "1",
        },
      });

      const c = customerRes.data[0];
      if (!c) return { email, customer: null };

      return {
        email,
        customer: {
          id: c.name,
          name: c.customer_name,
          group: c.customer_group,
          mobile: c.mobile_no,
          email: c.email_id,
          loyaltyProgram: c.loyalty_program,
          birthDate: c.custom_tanggal_lahir,
        },
      };
    } catch {
      return null;
    }
  },
);

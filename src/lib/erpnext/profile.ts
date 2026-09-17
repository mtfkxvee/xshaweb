import { createServerFn } from "@tanstack/react-start";
import { getCookie, setResponseHeader } from "@tanstack/react-start/server";
import { getCurrentCustomer, SESSION_COOKIE } from "./auth";
import { erpRequest, jsonFields, jsonFilters } from "./client";
import { isErpnextConfigured } from "./config";

export type UpdateProfileResult = { ok: true } | { ok: false; message: string };

export type MyAddress = { addressName: string | null; line1: string; city: string };

const COUNTRY = "Indonesia";

export const getMyAddress = createServerFn({ method: "GET" }).handler(
  async (): Promise<MyAddress | null> => {
    // Per-customer address — never cache (same fixed no-arg URL every call).
    setResponseHeader("Cache-Control", "no-store");

    if (!isErpnextConfigured()) return null;

    const sid = getCookie(SESSION_COOKIE);
    if (!sid) return null;

    const auth = await getCurrentCustomer();
    if (!auth?.customer) return null;

    const res = await erpRequest<{
      data: { name: string; address_line1: string; city: string }[];
    }>("/api/resource/Address", {
      params: {
        fields: jsonFields(["name", "address_line1", "city"]),
        filters: jsonFilters([
          ["Dynamic Link", "link_doctype", "=", "Customer"],
          ["Dynamic Link", "link_name", "=", auth.customer.id],
        ]),
        limit_page_length: "1",
      },
    });

    const a = res.data[0];
    return a
      ? { addressName: a.name, line1: a.address_line1, city: a.city }
      : { addressName: null, line1: "", city: "" };
  },
);

export type ProfileUpdateInput = {
  name: string;
  mobile: string;
  birthDate?: string;
  addressLine1: string;
  city: string;
};

// Shared by the web's edit-profile form (cookie session, below) and the
// mobile app's own routes (bearer sid) — both just need "write these fields
// onto this customer" once the caller has already verified who's asking.
export async function applyProfileUpdate(
  customerId: string,
  data: ProfileUpdateInput,
): Promise<UpdateProfileResult> {
  try {
    // Writes with the admin API key, scoped to this verified customer's own
    // id — same reasoning as elsewhere in this integration: a portal
    // customer's own role typically has no write permission on Customer or
    // Address.
    await erpRequest(`/api/resource/Customer/${encodeURIComponent(customerId)}`, {
      method: "PUT",
      body: {
        customer_name: data.name,
        mobile_no: data.mobile,
        custom_tanggal_lahir: data.birthDate || null,
      },
    });

    if (data.addressLine1 && data.city) {
      const existing = await erpRequest<{ data: { name: string }[] }>("/api/resource/Address", {
        params: {
          fields: jsonFields(["name"]),
          filters: jsonFilters([
            ["Dynamic Link", "link_doctype", "=", "Customer"],
            ["Dynamic Link", "link_name", "=", customerId],
          ]),
          limit_page_length: "1",
        },
      });

      if (existing.data[0]) {
        await erpRequest(`/api/resource/Address/${encodeURIComponent(existing.data[0].name)}`, {
          method: "PUT",
          body: { address_line1: data.addressLine1, city: data.city },
        });
      } else {
        await erpRequest("/api/resource/Address", {
          method: "POST",
          body: {
            address_title: data.name,
            address_type: "Personal",
            address_line1: data.addressLine1,
            city: data.city,
            country: COUNTRY,
            is_primary_address: 1,
            links: [{ link_doctype: "Customer", link_name: customerId }],
          },
        });
      }
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Gagal menyimpan." };
  }
}

export const updateMyProfile = createServerFn({ method: "POST" })
  .validator((input: ProfileUpdateInput) => input)
  .handler(async ({ data }): Promise<UpdateProfileResult> => {
    if (!isErpnextConfigured()) return { ok: false, message: "ERPNext belum dikonfigurasi." };

    const sid = getCookie(SESSION_COOKIE);
    if (!sid) return { ok: false, message: "Anda belum masuk." };

    const auth = await getCurrentCustomer();
    if (!auth?.customer) return { ok: false, message: "Anda belum masuk." };

    return applyProfileUpdate(auth.customer.id, data);
  });

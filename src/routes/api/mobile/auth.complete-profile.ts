import { createFileRoute } from "@tanstack/react-router";
import { applyProfileUpdate } from "@/lib/erpnext/profile";
import { corsPreflight, json, requireMobileUser } from "@/lib/erpnext/mobile-request";

type Body = {
  name?: string;
  mobile?: string;
  addressLine1?: string;
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
};

// Filled in right after a first-time Google sign-up, since the profile
// created from the Google account only has an email and a display name —
// no phone or address, which checkout and delivery both need.
export const Route = createFileRoute("/api/mobile/auth/complete-profile")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      POST: async ({ request }) => {
        const user = await requireMobileUser(request);
        if (!user?.customer) return json({ ok: false, message: "Anda belum masuk." }, { status: 401 });

        const body = (await request.json().catch(() => null)) as Body | null;
        if (!body?.name || !body?.mobile) {
          return json({ ok: false, message: "Nama dan nomor HP wajib diisi." }, { status: 400 });
        }

        const result = await applyProfileUpdate(user.customer.id, {
          name: body.name,
          mobile: body.mobile,
          addressLine1: body.addressLine1 ?? "",
          city: body.city ?? "",
          latitude: body.latitude ?? null,
          longitude: body.longitude ?? null,
        });
        return json(result, { status: result.ok ? 200 : 400 });
      },
    },
  },
});

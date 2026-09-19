import { createFileRoute } from "@tanstack/react-router";
import { resolveOrders, submitOrder } from "@/lib/erpnext/orders";
import { corsPreflight, json, requireMobileUser } from "@/lib/erpnext/mobile-request";
import type { OrderLine } from "@/lib/erpnext/types";

export const Route = createFileRoute("/api/mobile/orders")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: async ({ request }) => {
        const user = await requireMobileUser(request);
        return json(await resolveOrders(user?.customer ?? null));
      },
      POST: async ({ request }) => {
        const user = await requireMobileUser(request);
        const body = (await request.json().catch(() => null)) as {
          items?: OrderLine[];
          note?: string;
          returnUrl?: string;
        } | null;
        if (!body?.items?.length) {
          return json({ ok: false, reason: "erpnext_error", message: "Keranjang kosong." }, { status: 400 });
        }
        const result = await submitOrder(
          // The Customer record can lack an email (in-store sign-ups) — fall back to
          // the login email so DOKU, which requires one, still gets a session.
          user?.customer ? { ...user.customer, email: user.customer.email ?? user.email } : null,
          body.items,
          body.note,
          body.returnUrl,
        );
        return json(result);
      },
    },
  },
});

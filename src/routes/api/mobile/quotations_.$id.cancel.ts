import { createFileRoute } from "@tanstack/react-router";
import { cancelQuotation } from "@/lib/erpnext/orders";
import { corsPreflight, json, requireMobileUser } from "@/lib/erpnext/mobile-request";

// "Batalkan Pesanan" on an order the customer hasn't paid for.
export const Route = createFileRoute("/api/mobile/quotations_/$id/cancel")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      POST: async ({ params, request }) => {
        const user = await requireMobileUser(request);
        if (!user?.customer) return json({ ok: false, message: "Anda belum masuk." }, { status: 401 });

        const result = await cancelQuotation(user.customer, params.id);
        return json(result, { status: result.ok ? 200 : 400 });
      },
    },
  },
});

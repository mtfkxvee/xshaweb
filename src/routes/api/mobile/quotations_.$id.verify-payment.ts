import { createFileRoute } from "@tanstack/react-router";
import { verifyQuotationPayment } from "@/lib/erpnext/orders";
import { corsPreflight, json, requireMobileUser } from "@/lib/erpnext/mobile-request";

// Called by the app right after the customer returns from the payment page,
// when the order still shows unpaid: asks DOKU directly instead of waiting
// for (or depending on) the webhook.
export const Route = createFileRoute("/api/mobile/quotations_/$id/verify-payment")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      POST: async ({ params, request }) => {
        const user = await requireMobileUser(request);
        if (!user?.customer) return json({ ok: false, message: "Anda belum masuk." }, { status: 401 });

        const result = await verifyQuotationPayment(user.customer, params.id);
        return json(result, { status: result.ok ? 200 : 400 });
      },
    },
  },
});

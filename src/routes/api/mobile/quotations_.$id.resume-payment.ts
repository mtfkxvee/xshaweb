import { createFileRoute } from "@tanstack/react-router";
import { resumeQuotationPayment } from "@/lib/erpnext/orders";
import { corsPreflight, json, requireMobileUser } from "@/lib/erpnext/mobile-request";

type Body = { returnUrl?: string };

export const Route = createFileRoute("/api/mobile/quotations_/$id/resume-payment")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      POST: async ({ request, params }) => {
        const user = await requireMobileUser(request);
        if (!user?.customer) return json({ ok: false, message: "Anda belum masuk." }, { status: 401 });

        const body = (await request.json().catch(() => null)) as Body | null;
        if (!body?.returnUrl) {
          return json({ ok: false, message: "returnUrl wajib diisi." }, { status: 400 });
        }

        const result = await resumeQuotationPayment(
          { ...user.customer, email: user.customer.email ?? user.email },
          params.id,
          body.returnUrl,
        );
        return json(result, { status: result.ok ? 200 : 400 });
      },
    },
  },
});

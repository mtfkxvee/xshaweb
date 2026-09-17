import { createFileRoute } from "@tanstack/react-router";
import { resolveOrderDetail } from "@/lib/erpnext/orders";
import { corsPreflight, json, requireMobileUser } from "@/lib/erpnext/mobile-request";

export const Route = createFileRoute("/api/mobile/orders_/$id")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: async ({ request, params }) => {
        const user = await requireMobileUser(request);
        const detail = await resolveOrderDetail(user?.customer ?? null, params.id);
        if (!detail) return json({ message: "Pesanan tidak ditemukan." }, { status: 404 });
        return json(detail);
      },
    },
  },
});

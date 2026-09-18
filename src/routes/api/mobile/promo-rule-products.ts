import { createFileRoute } from "@tanstack/react-router";
import { getPromoRuleProducts } from "@/lib/erpnext/products";
import { corsPreflight, json, proxyPrivateImage } from "@/lib/erpnext/mobile-request";

export const Route = createFileRoute("/api/mobile/promo-rule-products")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const ruleId = url.searchParams.get("ruleId");
        const warehouse = url.searchParams.get("warehouse") ?? undefined;
        if (!ruleId) return json({ message: "ruleId wajib diisi." }, { status: 400 });

        const result = await getPromoRuleProducts({ data: { ruleId, warehouse } });
        if (!result) return json({ message: "Promo tidak ditemukan." }, { status: 404 });

        return json({
          ...result,
          products: result.products.map((p) => ({
            ...p,
            image: proxyPrivateImage(p.image, request.url),
          })),
        });
      },
    },
  },
});

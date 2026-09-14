import { createFileRoute } from "@tanstack/react-router";
import { getPromoProducts } from "@/lib/erpnext/products";
import { corsPreflight, json, proxyPrivateImage } from "@/lib/erpnext/mobile-request";

export const Route = createFileRoute("/api/mobile/promo-products")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: async ({ request }) => {
        const warehouse = new URL(request.url).searchParams.get("warehouse") ?? undefined;
        const products = await getPromoProducts({ data: { warehouse } });
        return json(
          products.map((p) => ({ ...p, image: proxyPrivateImage(p.image, request.url) })),
        );
      },
    },
  },
});

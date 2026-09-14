import { createFileRoute } from "@tanstack/react-router";
import { getProductById } from "@/lib/erpnext/products";
import { corsPreflight, json, proxyPrivateImage } from "@/lib/erpnext/mobile-request";

export const Route = createFileRoute("/api/mobile/products_/$id")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: async ({ params, request }) => {
        const product = await getProductById({ data: { id: params.id } });
        return json(product && { ...product, image: proxyPrivateImage(product.image, request.url) });
      },
    },
  },
});

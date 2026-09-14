import { createFileRoute } from "@tanstack/react-router";
import { getPromoBanners } from "@/lib/erpnext/products";
import { corsPreflight, json, proxyPrivateImage } from "@/lib/erpnext/mobile-request";

export const Route = createFileRoute("/api/mobile/promo-banners")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: async ({ request }) => {
        const banners = await getPromoBanners();
        return json(
          banners.map((b) => ({ ...b, image: proxyPrivateImage(b.image, request.url) })),
        );
      },
    },
  },
});

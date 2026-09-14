import { createFileRoute } from "@tanstack/react-router";
import { getProducts, type ProductQuery } from "@/lib/erpnext/products";
import { corsPreflight, json, proxyPrivateImage } from "@/lib/erpnext/mobile-request";

export const Route = createFileRoute("/api/mobile/products")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const p = url.searchParams;
        const query: ProductQuery = {
          search: p.get("search") ?? undefined,
          itemGroup: p.get("itemGroup") ?? undefined,
          itemGroupIsGroup: p.get("itemGroupIsGroup") === "1",
          warehouse: p.get("warehouse") ?? undefined,
          sort: (p.get("sort") as ProductQuery["sort"]) ?? undefined,
          page: p.get("page") ? Number(p.get("page")) : undefined,
          pageSize: p.get("pageSize") ? Number(p.get("pageSize")) : undefined,
        };
        const result = await getProducts({ data: query });
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

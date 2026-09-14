import { createFileRoute } from "@tanstack/react-router";
import { getItemGroupChildren } from "@/lib/erpnext/products";
import { corsPreflight, json } from "@/lib/erpnext/mobile-request";

export const Route = createFileRoute("/api/mobile/item-groups")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: async ({ request }) => {
        const parent = new URL(request.url).searchParams.get("parent") ?? undefined;
        const groups = await getItemGroupChildren({ data: { parent } });
        return json(groups);
      },
    },
  },
});

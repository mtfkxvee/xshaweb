import { createFileRoute } from "@tanstack/react-router";
import { checkItemsInStock } from "@/lib/erpnext/products";
import { corsPreflight, json } from "@/lib/erpnext/mobile-request";
import { isErpnextConfigured } from "@/lib/erpnext/config";

type Body = { itemCodes?: string[]; warehouse?: string };

// Checked right before Cart hands off to Checkout, against whichever
// outlet is currently selected — catches a cart item that's since sold
// out at that specific location instead of the shopper finding out only
// after they've already gone through checkout.
export const Route = createFileRoute("/api/mobile/products_/check-stock")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as Body | null;
        if (!body?.itemCodes?.length || !body.warehouse) {
          return json({ outOfStock: [] });
        }
        if (!isErpnextConfigured()) return json({ outOfStock: [] });

        const inStock = await checkItemsInStock(body.itemCodes, body.warehouse);
        const outOfStock = body.itemCodes.filter((code) => !inStock.has(code));
        return json({ outOfStock });
      },
    },
  },
});

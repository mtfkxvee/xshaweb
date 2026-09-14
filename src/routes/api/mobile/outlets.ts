import { createFileRoute } from "@tanstack/react-router";
import { getOutlets } from "@/lib/erpnext/outlets";
import { corsPreflight, json, proxyPrivateImage } from "@/lib/erpnext/mobile-request";

export const Route = createFileRoute("/api/mobile/outlets")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: async ({ request }) => {
        const outlets = await getOutlets();
        return json(
          outlets.map((o) => ({
            ...o,
            image: o.image ? proxyPrivateImage(o.image, request.url) : o.image,
          })),
        );
      },
    },
  },
});

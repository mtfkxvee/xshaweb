import { createFileRoute } from "@tanstack/react-router";
import { getRoadDistancesKm, type LatLng } from "@/lib/erpnext/routing";
import { corsPreflight, json } from "@/lib/erpnext/mobile-request";

export const Route = createFileRoute("/api/mobile/route-distance")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as {
          origin?: LatLng;
          destinations?: LatLng[];
        } | null;
        if (!body?.origin || !body.destinations?.length) {
          return json({ message: "origin dan destinations wajib diisi." }, { status: 400 });
        }
        const distancesKm = await getRoadDistancesKm(body.origin, body.destinations);
        return json({ distancesKm });
      },
    },
  },
});

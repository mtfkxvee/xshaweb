import { getErpnextConfig, isErpnextConfigured } from "./config";

export type LatLng = { lat: number; lng: number };

// Self-hosted OSRM instance proxied under the ERPNext domain — used for
// real road distance instead of straight-line, both for sorting outlets by
// distance and for the distance shown on Checkout.
const OSRM_PATH = "/osrm-route";

type OsrmTableResponse = { code: string; distances?: (number | null)[][] };

// One-to-many road distance via OSRM's table service — one request instead
// of N (e.g. sorting a whole outlet list by distance from the customer).
// Returns km per destination, in the same order as `destinations`; a
// destination OSRM can't route to (or a request failure) comes back null
// rather than throwing, since this only ever affects sort order/display.
export async function getRoadDistancesKm(origin: LatLng, destinations: LatLng[]): Promise<(number | null)[]> {
  if (destinations.length === 0) return [];
  if (!isErpnextConfigured()) return destinations.map(() => null);

  const config = getErpnextConfig()!;
  const coords = [origin, ...destinations].map((p) => `${p.lng},${p.lat}`).join(";");

  try {
    const res = await fetch(
      `${config.url}${OSRM_PATH}/table/v1/driving/${coords}?sources=0&annotations=distance`,
    );
    if (!res.ok) return destinations.map(() => null);
    const json = (await res.json()) as OsrmTableResponse;
    if (json.code !== "Ok") return destinations.map(() => null);
    // Row 0 is the (only) source; column 0 is origin->origin — the rest
    // align 1:1 with `destinations`.
    const row = json.distances?.[0] ?? [];
    return destinations.map((_, i) => {
      const meters = row[i + 1];
      return typeof meters === "number" ? meters / 1000 : null;
    });
  } catch {
    return destinations.map(() => null);
  }
}

import { useQuery } from "@tanstack/react-query";
import { getSiteSettings } from "@/lib/erpnext/site-settings";
import { mockSiteSettings } from "@/lib/erpnext/mock-data";

export const SITE_SETTINGS_QUERY_KEY = ["site-settings"] as const;

// Falls back to a snapshot of the current content so pages never show an
// empty/loading state — swaps to live ERPNext content once the query
// resolves. staleTime matches the server's own Cache-Control max-age (see
// site-settings.ts) so the client doesn't refetch more often than the
// response would actually change anyway.
export function useSiteSettings() {
  const { data } = useQuery({
    queryKey: SITE_SETTINGS_QUERY_KEY,
    queryFn: () => getSiteSettings(),
    staleTime: 60_000,
  });
  return data ?? mockSiteSettings;
}

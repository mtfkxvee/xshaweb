import { erpRequest, jsonFields, jsonFilters } from "./erpnext/client";
import { isErpnextConfigured } from "./erpnext/config";

// Generated directly from process.env + a raw ERPNext fetch (not via the
// createServerFn-wrapped getBlogPosts), because this runs from the Worker's
// top-level fetch handler, outside the h3 request context that
// createServerFn/setResponseHeader rely on.
const STATIC_PATHS = ["/", "/katalog", "/promo", "/blog", "/tentang", "/kontak"];

async function getPublishedBlogSlugs(): Promise<string[]> {
  if (!isErpnextConfigured()) return [];
  try {
    const res = await erpRequest<{ data: { name: string }[] }>("/api/resource/Blog Post", {
      params: {
        fields: jsonFields(["name"]),
        filters: jsonFilters([["published", "=", 1]]),
        limit_page_length: "0",
      },
    });
    return res.data.map((p) => p.name);
  } catch {
    // A sitemap missing the newest posts is far better than a 500 on the
    // whole endpoint — fall back to the static routes only.
    return [];
  }
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function renderSitemap(origin: string): Promise<string> {
  const blogSlugs = await getPublishedBlogSlugs();
  const paths = [...STATIC_PATHS, ...blogSlugs.map((slug) => `/blog/${slug}`)];

  const urls = paths
    .map((path) => `  <url><loc>${escapeXml(encodeURI(`${origin}${path}`))}</loc></url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

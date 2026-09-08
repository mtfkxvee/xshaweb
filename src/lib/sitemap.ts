import { erpRequest, jsonFields, jsonFilters } from "./erpnext/client";
import { isErpnextConfigured } from "./erpnext/config";

// Generated directly from process.env + a raw ERPNext fetch (not via the
// createServerFn-wrapped getBlogPosts), because this runs from the Worker's
// top-level fetch handler, outside the h3 request context that
// createServerFn/setResponseHeader rely on.
const STATIC_PATHS = ["/", "/katalog", "/promo", "/blog", "/tentang", "/karir", "/kontak"];

type BlogSitemapEntry = { slug: string; lastmod: string | null };

async function getPublishedBlogEntries(): Promise<BlogSitemapEntry[]> {
  if (!isErpnextConfigured()) return [];
  try {
    const res = await erpRequest<{ data: { name: string; modified: string }[] }>(
      "/api/resource/Blog Post",
      {
        params: {
          fields: jsonFields(["name", "modified"]),
          filters: jsonFilters([["published", "=", 1]]),
          order_by: "modified desc",
          limit_page_length: "0",
        },
      },
    );
    return res.data.map((p) => ({ slug: p.name, lastmod: p.modified }));
  } catch {
    // A sitemap missing the newest posts is far better than a 500 on the
    // whole endpoint — fall back to the static routes only.
    return [];
  }
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ERPNext's "modified" timestamp is "YYYY-MM-DD HH:MM:SS" in the business's
// own timezone (Asia/Jakarta) — sitemap lastmod wants a proper date.
function toLastmodDate(value: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

function urlEntry(loc: string, lastmod?: string | null): string {
  const lastmodTag = lastmod ? `<lastmod>${lastmod}</lastmod>` : "";
  return `  <url><loc>${escapeXml(encodeURI(loc))}</loc>${lastmodTag}</url>`;
}

export async function renderSitemap(origin: string): Promise<string> {
  const blogEntries = await getPublishedBlogEntries();

  const urls = [
    ...STATIC_PATHS.map((path) => urlEntry(`${origin}${path}`)),
    ...blogEntries.map((entry) =>
      urlEntry(`${origin}/blog/${entry.slug}`, toLastmodDate(entry.lastmod)),
    ),
  ].join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

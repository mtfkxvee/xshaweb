import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/reveal";
import { getBlogPostsPage } from "@/lib/erpnext/blog";
import { useSiteSettings } from "@/hooks/use-site-settings";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/blog")({
  validateSearch: (search: Record<string, unknown>): { page?: number } => {
    const page = Number(search.page);
    return Number.isInteger(page) && page > 1 ? { page } : {};
  },
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  // Runs server-side on the initial request, so the post list (and its
  // links to each article) are present in the raw HTML for crawlers —
  // fetching this client-only left the index page with no discoverable
  // links to any post in the un-hydrated HTML.
  loader: ({ deps }) => getBlogPostsPage({ data: { page: deps.page, pageSize: PAGE_SIZE } }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title:
          loaderData && loaderData.page > 1
            ? `Blog | X-SHA — Halaman ${loaderData.page}`
            : "Blog | X-SHA",
      },
      { name: "description", content: "Tips, inspirasi, dan cerita seputar produk X-SHA." },
    ],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const { posts, total, page, pageSize } = Route.useLoaderData();
  const settings = useSiteSettings();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <SiteLayout>
      <div className="mx-auto max-w-container-max px-gutter pb-stack-lg">
        <header className="mb-stack-lg">
          <h1 className="font-display text-headline-lg-mobile md:text-display-lg">
            {settings.blogPageHeading}
          </h1>
          <p className="mt-2 max-w-2xl text-body-lg text-on-surface-variant">
            {settings.blogPageSubtext}
          </p>
        </header>

        {posts.length === 0 && (
          <p className="py-16 text-center text-on-surface-variant">
            Belum ada artikel yang dipublikasikan.
          </p>
        )}

        <Reveal>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                to="/blog/$postId"
                params={{ postId: post.id }}
                className="hover-lift group overflow-hidden rounded-[24px] glass-panel"
              >
                <div className="relative h-48">
                  <img
                    src={post.image}
                    alt={post.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  {post.category && (
                    <p className="mb-1 text-label-md uppercase text-secondary">{post.category}</p>
                  )}
                  <h3 className="mb-2 text-[18px] font-semibold text-on-surface">{post.title}</h3>
                  <p className="mb-4 line-clamp-2 text-sm text-on-surface-variant">{post.intro}</p>
                  <span className="text-sm font-bold text-primary group-hover:underline">
                    Baca Selengkapnya →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Reveal>

        {totalPages > 1 && (
          <nav className="mt-stack-lg flex items-center justify-center gap-4">
            {page > 1 ? (
              <Link
                to="/blog"
                search={page - 1 > 1 ? { page: page - 1 } : {}}
                className="flex items-center gap-1 rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
              >
                <Icon name="chevron_left" className="text-[18px]" />
                Sebelumnya
              </Link>
            ) : (
              <span className="flex items-center gap-1 rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant opacity-40">
                <Icon name="chevron_left" className="text-[18px]" />
                Sebelumnya
              </span>
            )}

            <span className="text-sm text-on-surface-variant">
              Halaman {page} dari {totalPages}
            </span>

            {page < totalPages ? (
              <Link
                to="/blog"
                search={{ page: page + 1 }}
                className="flex items-center gap-1 rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
              >
                Berikutnya
                <Icon name="chevron_right" className="text-[18px]" />
              </Link>
            ) : (
              <span className="flex items-center gap-1 rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant opacity-40">
                Berikutnya
                <Icon name="chevron_right" className="text-[18px]" />
              </span>
            )}
          </nav>
        )}
      </div>
    </SiteLayout>
  );
}

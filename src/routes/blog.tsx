import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { Reveal } from "@/components/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { getBlogPosts } from "@/lib/erpnext/blog";
import { useSiteSettings } from "@/hooks/use-site-settings";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog | X-SHA" },
      { name: "description", content: "Tips, inspirasi, dan cerita seputar produk X-SHA." },
    ],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog-posts", { limit: 20 }],
    queryFn: () => getBlogPosts({ data: { limit: 20 } }),
  });
  const settings = useSiteSettings();

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

        {isLoading && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-3xl" />
            ))}
          </div>
        )}

        {!isLoading && (posts?.length ?? 0) === 0 && (
          <p className="py-16 text-center text-on-surface-variant">
            Belum ada artikel yang dipublikasikan.
          </p>
        )}

        <Reveal>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {posts?.map((post) => (
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
      </div>
    </SiteLayout>
  );
}

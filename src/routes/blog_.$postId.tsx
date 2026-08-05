import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { getBlogPost } from "@/lib/erpnext/blog";

export const Route = createFileRoute("/blog_/$postId")({
  loader: async ({ params }) => {
    const post = await getBlogPost({ data: { id: params.postId } });
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} | Blog X-SHA` },
          { name: "description", content: loaderData.intro },
        ]
      : [],
  }),
  component: BlogDetail,
});

function BlogDetail() {
  const post = Route.useLoaderData();

  return (
    <SiteLayout>
      <article className="mx-auto max-w-3xl px-gutter pb-stack-lg">
        <Link
          to="/blog"
          className="mb-6 inline-block text-sm font-bold text-primary hover:underline"
        >
          ← Kembali ke Blog
        </Link>
        {post.category && (
          <p className="mb-2 text-label-md uppercase text-secondary">{post.category}</p>
        )}
        <h1 className="mb-4 font-display text-headline-lg-mobile md:text-display-lg">
          {post.title}
        </h1>
        {post.publishedOn && (
          <p className="mb-6 text-sm text-on-surface-variant">
            {new Date(post.publishedOn).toLocaleDateString("id-ID", { dateStyle: "long" })}
          </p>
        )}
        <div className="mb-8 aspect-video overflow-hidden rounded-3xl">
          <img src={post.image} alt={post.title} className="h-full w-full object-cover" />
        </div>
        {/* Blog content is authored in ERPNext by the X-SHA team, not user
            submitted, so rendering it as trusted HTML is acceptable here. */}
        <div
          className="prose max-w-none text-on-surface"
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      </article>
    </SiteLayout>
  );
}

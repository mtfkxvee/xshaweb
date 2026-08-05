import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { erpRequest, jsonFields, jsonFilters } from "./client";
import { getErpnextConfig, isErpnextConfigured } from "./config";

const CACHE_BLOG = "public, max-age=180, stale-while-revalidate=120";

export type BlogPost = {
  id: string;
  title: string;
  intro: string;
  image: string;
  category: string | null;
  publishedOn: string | null;
};

export type BlogPostDetail = BlogPost & {
  contentHtml: string;
};

const PLACEHOLDER_IMAGE = "/product-placeholder.svg";

type ErpBlogPost = {
  name: string;
  title: string;
  blog_intro: string | null;
  meta_image: string | null;
  blog_category: string | null;
  published_on: string | null;
  published: number;
};

function mapBlogPost(post: ErpBlogPost, erpBaseUrl: string): BlogPost {
  return {
    id: post.name,
    title: post.title,
    intro: post.blog_intro ?? "",
    image: post.meta_image ? `${erpBaseUrl}${post.meta_image}` : PLACEHOLDER_IMAGE,
    category: post.blog_category,
    publishedOn: post.published_on,
  };
}

export const getBlogPosts = createServerFn({ method: "GET" })
  .validator((input: { limit?: number } | undefined) => input)
  .handler(async ({ data }): Promise<BlogPost[]> => {
    setResponseHeader("Cache-Control", CACHE_BLOG);

    if (!isErpnextConfigured()) return [];

    const config = getErpnextConfig()!;
    const res = await erpRequest<{ data: ErpBlogPost[] }>("/api/resource/Blog Post", {
      params: {
        fields: jsonFields([
          "name",
          "title",
          "blog_intro",
          "meta_image",
          "blog_category",
          "published_on",
        ]),
        filters: jsonFilters([["published", "=", 1]]),
        order_by: "published_on desc",
        limit_page_length: String(data?.limit ?? 3),
      },
    });

    return res.data.map((post) => mapBlogPost(post, config.url));
  });

export const getBlogPost = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }): Promise<BlogPostDetail | null> => {
    setResponseHeader("Cache-Control", CACHE_BLOG);

    if (!isErpnextConfigured()) return null;

    const config = getErpnextConfig()!;
    try {
      const res = await erpRequest<{
        data: ErpBlogPost & { content: string | null; content_html: string | null };
      }>(`/api/resource/Blog Post/${encodeURIComponent(data.id)}`, {
        params: {
          fields: jsonFields([
            "name",
            "title",
            "blog_intro",
            "meta_image",
            "blog_category",
            "published_on",
            "published",
            "content",
            "content_html",
          ]),
        },
      });
      // Direct-link access to a draft (unpublished) post is refused the same
      // way a missing post is — the shopper sees "not found", not a leak.
      if (!res.data.published) return null;
      return {
        ...mapBlogPost(res.data, config.url),
        contentHtml: res.data.content_html ?? res.data.content ?? "",
      };
    } catch {
      return null;
    }
  });

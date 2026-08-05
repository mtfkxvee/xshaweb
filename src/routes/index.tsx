import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/reveal";
import { useCart } from "@/components/cart-context";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { IMG } from "@/lib/catalog-data";
import { formatIDR } from "@/lib/utils";
import { getProducts, getPromoBanners, getPromoProducts } from "@/lib/erpnext/products";
import { getBlogPosts } from "@/lib/erpnext/blog";
import { useSiteSettings } from "@/hooks/use-site-settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "X-SHA | Heritage of Tasikmalaya, Modern Living" },
      {
        name: "description",
        content:
          "Belanja produk kurasi halal khas Tasikmalaya: batik, tenun, kelom geulis, kopi Galunggung. 16+ outlet & 40.000+ member setia.",
      },
      { property: "og:title", content: "X-SHA | Heritage of Tasikmalaya, Modern Living" },
      {
        property: "og:description",
        content:
          "Produk kurasi halal khas Tasikmalaya, promo member, dan 16+ outlet regional sejak 2006.",
      },
      { property: "og:image", content: IMG.hero },
      { name: "twitter:image", content: IMG.hero },
    ],
  }),
  component: Beranda,
});

function Beranda() {
  const { add } = useCart();
  const [api, setApi] = useState<CarouselApi>();

  const settings = useSiteSettings();

  useEffect(() => {
    if (!api) return;
    const timer = setInterval(() => {
      api.scrollNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [api]);

  const { data: banners } = useQuery({
    queryKey: ["promo-banners"],
    queryFn: () => getPromoBanners(),
  });

  const { data: deals, isLoading: dealsLoading } = useQuery({
    queryKey: ["promo-products"],
    queryFn: () => getPromoProducts(),
  });

  const { data: productsPage, isLoading: productsLoading } = useQuery({
    queryKey: ["products", { pageSize: 5 }],
    queryFn: () => getProducts({ data: { page: 1, pageSize: 5 } }),
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["blog-posts", { limit: 3 }],
    queryFn: () => getBlogPosts({ data: { limit: 3 } }),
  });

  const products = productsPage?.products ?? [];

  return (
    <SiteLayout>
      <div className="mx-auto max-w-container-max px-gutter pb-stack-lg">
        <section className="mb-stack-lg">
          <Carousel
            setApi={setApi}
            opts={{ loop: true }}
            className="h-[440px] overflow-hidden rounded-3xl glass-panel sm:h-[420px]"
          >
            <CarouselContent className="-ml-0">
              {settings.heroSlides.map((slide) => (
                <CarouselItem key={slide.alt} className="pl-0">
                  <img
                    src={slide.image}
                    alt={slide.alt}
                    className="h-[440px] w-full object-cover sm:h-[420px]"
                  />
                </CarouselItem>
              ))}
            </CarouselContent>

            {/* Fixed overlay — stays put while the carousel behind it changes
                images, instead of re-animating in per slide. */}
            <div className="pointer-events-none absolute inset-0 flex items-center bg-gradient-to-r from-primary/70 via-primary/40 to-transparent p-5 sm:p-8 md:p-12">
              <div className="pointer-events-auto max-w-xl">
                <h1 className="font-display text-headline-lg-mobile text-on-primary md:text-display-lg">
                  {settings.heroHeadline}
                </h1>
                <p className="mt-3 line-clamp-2 text-sm text-on-primary/85 sm:mt-4 sm:line-clamp-none sm:text-body-lg">
                  {settings.heroSubtext}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 sm:mt-8">
                  <a
                    href={settings.heroCtaPrimaryLink}
                    className="rounded-xl bg-white px-6 py-3 font-bold text-primary transition-all hover:brightness-95 active:scale-95"
                  >
                    {settings.heroCtaPrimaryLabel}
                  </a>
                  <a
                    href={settings.heroCtaSecondaryLink}
                    className="rounded-xl border border-white/50 px-6 py-3 font-bold text-on-primary transition-all hover:bg-white/15 active:scale-95"
                  >
                    {settings.heroCtaSecondaryLabel}
                  </a>
                </div>
              </div>
            </div>

            <CarouselPrevious className="left-4 hidden border-none bg-white/70 text-primary hover:bg-white sm:flex" />
            <CarouselNext className="right-4 hidden border-none bg-white/70 text-primary hover:bg-white sm:flex" />
          </Carousel>
        </section>

        {(banners?.length ?? 0) > 0 && (
          <Reveal>
            <section className="mb-stack-lg">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-headline-md">Promo Lainnya</h2>
                <Link to="/promo" className="font-bold text-primary hover:underline">
                  Lihat Semua
                </Link>
              </div>
              <div className="scroll-hide -mx-gutter flex snap-x gap-4 overflow-x-auto px-gutter sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
                {banners?.map((b) => (
                  <Link
                    key={b.id}
                    to="/promo"
                    search={{ rule: b.id }}
                    className="block w-64 shrink-0 snap-start overflow-hidden rounded-2xl glass-panel transition-transform hover:scale-[1.02] sm:w-auto"
                  >
                    <img
                      src={b.image}
                      alt={b.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </Link>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        <Reveal>
          <section className="mb-stack-lg">
            <h2 className="mb-6 text-center text-headline-md">{settings.servicesHeading}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-gutter lg:grid-cols-6">
              {settings.services.map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col items-center gap-2 rounded-2xl glass-panel p-4 text-center"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon name={s.icon} />
                  </div>
                  <p className="text-sm font-semibold text-on-surface">{s.label}</p>
                  <p className="text-xs text-on-surface-variant">{s.description}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className="mb-stack-lg">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="text-headline-md">Penawaran Kilat</h2>
              <Link to="/promo" className="font-bold text-primary hover:underline">
                Lihat Koleksi
              </Link>
            </div>
            <div className="scroll-hide -mx-gutter flex snap-x gap-4 overflow-x-auto px-gutter sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 lg:grid-cols-4">
              {dealsLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-72 w-48 shrink-0 rounded-3xl sm:w-auto" />
                ))}
              {deals?.slice(0, 4).map((p) => (
                <article
                  key={p.id}
                  className="group flex w-48 shrink-0 snap-start flex-col overflow-hidden rounded-3xl glass-panel transition-all duration-300 hover:-translate-y-1 hover:shadow-glass-lg sm:w-auto"
                >
                  <div className="relative h-40">
                    <img
                      src={p.image}
                      alt={p.alt}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-secondary px-3 py-1 text-[10px] font-bold uppercase text-on-secondary">
                      -{p.discountPercent}%
                    </span>
                  </div>
                  <div className="flex flex-grow flex-col p-4">
                    <h3 className="mb-2 text-[15px] font-semibold">{p.name}</h3>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-display text-price-display text-primary">
                          {formatIDR(p.price)}
                        </span>
                        <span className="text-xs text-on-surface-variant line-through">
                          {formatIDR(p.oldPrice)}
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label={`Tambah ${p.name} ke keranjang`}
                        onClick={() =>
                          add({
                            id: p.id,
                            name: p.name,
                            price: p.price,
                            oldPrice: p.oldPrice,
                            image: p.image,
                            alt: p.alt,
                          })
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-full primary-gradient text-on-primary transition-transform active:scale-90"
                      >
                        <Icon name="add_shopping_cart" className="text-[18px]" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className="mb-stack-lg">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="text-headline-md">Produk Pilihan Untuk Anda</h2>
              <Link to="/katalog" className="font-bold text-primary hover:underline">
                Lihat Semua
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {productsLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-2xl" />
                ))}
              {!productsLoading && products.length === 0 && (
                <p className="col-span-full py-8 text-center text-on-surface-variant">
                  Belum ada produk yang bisa ditampilkan.
                </p>
              )}
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    add({ id: p.id, name: p.name, price: p.price, image: p.image, alt: p.alt })
                  }
                  className="group text-left"
                >
                  <div className="mb-2 aspect-square overflow-hidden rounded-2xl product-card-image">
                    <img
                      src={p.image}
                      alt={p.alt}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <p className="truncate text-sm font-semibold text-on-surface">{p.name}</p>
                  <p className="text-sm font-bold text-primary">{formatIDR(p.price)}</p>
                </button>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className="mb-stack-lg">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="text-headline-md">Inspirasi Belanja</h2>
              <Link to="/blog" className="font-bold text-primary hover:underline">
                Lihat Semua
              </Link>
            </div>

            {postsLoading && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-3xl" />
                ))}
              </div>
            )}

            {!postsLoading && (posts?.length ?? 0) === 0 && (
              <p className="py-8 text-center text-on-surface-variant">
                Belum ada artikel yang dipublikasikan.
              </p>
            )}

            <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-6">
              {posts?.map((post) => (
                <Link
                  key={post.id}
                  to="/blog/$postId"
                  params={{ postId: post.id }}
                  className="group flex overflow-hidden rounded-[24px] glass-panel transition-transform hover:scale-[1.02] md:flex-col"
                >
                  <div className="relative h-28 w-28 shrink-0 md:h-40 md:w-full">
                    <img
                      src={post.image}
                      alt={post.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col justify-center p-4 md:p-5">
                    {post.category && (
                      <p className="mb-1 text-[11px] uppercase text-secondary">{post.category}</p>
                    )}
                    <h3 className="mb-2 text-[16px] font-semibold text-on-surface">{post.title}</h3>
                    <span className="text-xs font-bold text-primary group-hover:underline">
                      Baca Selengkapnya →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className="overflow-hidden rounded-[32px] primary-gradient px-8 py-12 text-on-primary md:px-14">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <h2 className="font-display text-headline-lg-mobile md:text-headline-lg">
                  {settings.ctaBannerHeading}
                </h2>
                <p className="mt-2 max-w-xl text-body-md text-on-primary/85">
                  {settings.ctaBannerBody}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <a
                  href={settings.ctaBannerButtonLink}
                  className="rounded-xl bg-white px-6 py-3 font-bold text-primary transition-all hover:brightness-95 active:scale-95"
                >
                  {settings.ctaBannerButtonLabel}
                </a>
                <a
                  href={`https://wa.me/${settings.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-white/50 px-6 py-3 font-bold text-on-primary transition-all hover:bg-white/15 active:scale-95"
                >
                  Hubungi Layanan Pelanggan
                </a>
              </div>
            </div>
          </section>
        </Reveal>
      </div>
    </SiteLayout>
  );
}

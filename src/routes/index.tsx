import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { Icon } from "@/components/icon";
import { useCart } from "@/components/cart-context";
import { Skeleton } from "@/components/ui/skeleton";
import { IMG } from "@/lib/catalog-data";
import { formatIDR } from "@/lib/utils";
import { getProducts } from "@/lib/erpnext/products";

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
  const { data, isLoading } = useQuery({
    queryKey: ["products", { pageSize: 4 }],
    queryFn: () => getProducts({ data: { page: 1, pageSize: 4 } }),
  });
  const featured = data?.products ?? [];

  return (
    <SiteLayout>
      <div className="mx-auto max-w-container-max px-gutter pb-stack-lg">
        <section className="relative mb-stack-lg h-[420px] overflow-hidden rounded-3xl glass-panel">
          <img
            src={IMG.hero}
            alt="Etalase produk heritage Tasikmalaya di ruang ritel premium bernuansa violet"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-center bg-gradient-to-r from-primary/70 via-primary/40 to-transparent p-8 md:p-12">
            <div className="max-w-xl">
              <div className="mb-4 inline-flex items-center rounded-full border border-white/30 bg-white/20 px-4 py-1.5 backdrop-blur-md">
                <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-tertiary-fixed" />
                <span className="text-label-md text-on-primary">Sejak 2006 di Tasikmalaya</span>
              </div>
              <h1 className="font-display text-headline-lg-mobile text-on-primary md:text-display-lg">
                Heritage of Tasikmalaya, Modern Living.
              </h1>
              <p className="mt-4 text-body-lg text-on-primary/85">
                Produk kurasi berkualitas dengan jaminan kehalalan, hadir di 16+ outlet dan kini
                dalam genggaman Anda.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/katalog"
                  className="rounded-xl bg-white px-6 py-3 font-bold text-primary transition-all hover:brightness-95 active:scale-95"
                >
                  Jelajahi Katalog
                </Link>
                <Link
                  to="/member"
                  className="rounded-xl border border-white/50 px-6 py-3 font-bold text-on-primary transition-all hover:bg-white/15 active:scale-95"
                >
                  Member Area
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-stack-lg grid grid-cols-2 gap-gutter lg:grid-cols-4">
          {[
            { icon: "storefront", label: "16+ Outlet", desc: "Tersebar di Priangan Timur" },
            { icon: "verified", label: "Produk Kurasi", desc: "Seleksi ketat & halal" },
            { icon: "stars", label: "40.000+ Member", desc: "Poin loyalitas tiap belanja" },
            { icon: "payments", label: "Promo Rutin", desc: "Penawaran baru tiap minggu" },
          ].map((f) => (
            <div key={f.icon} className="rounded-3xl glass-panel p-stack-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon name={f.icon} />
              </div>
              <h3 className="mb-1 text-headline-md">{f.label}</h3>
              <p className="text-sm text-on-surface-variant">{f.desc}</p>
            </div>
          ))}
        </section>

        <section>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-headline-md">Pilihan Unggulan</h2>
              <p className="text-on-surface-variant">Paling dicari pelanggan minggu ini.</p>
            </div>
            <Link to="/katalog" className="font-bold text-primary hover:underline">
              Lihat Semua
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-3xl" />
              ))}
            {!isLoading && featured.length === 0 && (
              <p className="col-span-full py-8 text-center text-on-surface-variant">
                Belum ada produk yang bisa ditampilkan.
              </p>
            )}
            {featured.map((p) => (
              <article
                key={p.id}
                className="group flex flex-col rounded-3xl glass-panel p-4 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="mb-4 aspect-square overflow-hidden rounded-2xl product-card-image">
                  <img
                    src={p.image}
                    alt={p.alt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <p className="mb-1 text-label-md text-secondary">{p.category}</p>
                <h3 className="mb-3 text-[18px] font-semibold">{p.name}</h3>
                <div className="mt-auto flex items-center justify-between">
                  <span className="font-display text-price-display text-primary">
                    {formatIDR(p.price)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Tambah ${p.name} ke keranjang`}
                    onClick={() =>
                      add({ id: p.id, name: p.name, price: p.price, image: p.image, alt: p.alt })
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-full primary-gradient text-on-primary transition-transform active:scale-90"
                  >
                    <Icon name="add_shopping_cart" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}

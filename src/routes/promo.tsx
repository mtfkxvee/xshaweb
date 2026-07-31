import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { Icon } from "@/components/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/components/cart-context";
import { formatIDR } from "@/lib/utils";
import { getPromoProducts } from "@/lib/erpnext/products";

export const Route = createFileRoute("/promo")({
  head: () => ({
    meta: [
      { title: "Promo Spesial | X-SHA Tasikmalaya" },
      {
        name: "description",
        content:
          "Penawaran mingguan X-SHA: diskon batik, kelom geulis, kopi Galunggung, dan promo eksklusif khusus member.",
      },
      { property: "og:title", content: "Promo Spesial | X-SHA Tasikmalaya" },
      {
        property: "og:description",
        content: "Diskon mingguan dan promo eksklusif member di 16+ outlet X-SHA.",
      },
    ],
  }),
  component: Promo,
});

function Promo() {
  const { add } = useCart();
  const { data: deals, isLoading } = useQuery({
    queryKey: ["promo-products"],
    queryFn: () => getPromoProducts(),
  });

  const featured = deals?.[0];

  return (
    <SiteLayout>
      <div className="mx-auto max-w-container-max px-gutter pb-stack-lg">
        <header className="mb-stack-lg">
          <div className="mb-stack-sm inline-flex items-center rounded-full border border-primary/20 glass-panel px-4 py-1.5">
            <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-secondary" />
            <span className="text-label-md text-primary">Promo Minggu Ini</span>
          </div>
          <h1 className="font-display text-headline-lg-mobile md:text-display-lg">
            Penawaran <span className="gradient-text">Terbaik</span> Untuk Anda
          </h1>
          <p className="mt-2 max-w-2xl text-body-lg text-on-surface-variant">
            Harga spesial berlaku terbatas di seluruh outlet X-SHA dan pemesanan online via
            WhatsApp.
          </p>
        </header>

        {featured && (
          <section className="mb-stack-lg overflow-hidden rounded-[32px] glass-panel">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="relative h-64 md:h-full">
                <img
                  src={featured.image}
                  alt={featured.alt}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col justify-center gap-4 p-stack-md">
                <span className="w-fit rounded-full bg-tertiary-container px-3 py-1 text-[10px] font-bold uppercase text-on-tertiary-container">
                  Promo Pilihan
                </span>
                <h2 className="text-headline-lg">{featured.name}</h2>
                <p className="text-body-md text-on-surface-variant">
                  Hemat {featured.discountPercent}% untuk pembelian {featured.name} selama promo
                  berlangsung.
                </p>
                <div className="flex items-center gap-3">
                  <span className="font-display text-display-lg text-primary">
                    {formatIDR(featured.price)}
                  </span>
                  <span className="text-on-surface-variant line-through">
                    {formatIDR(featured.oldPrice)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    add({
                      id: featured.id,
                      name: featured.name,
                      price: featured.price,
                      oldPrice: featured.oldPrice,
                      image: featured.image,
                      alt: featured.alt,
                    })
                  }
                  className="w-fit rounded-xl primary-gradient px-6 py-3 font-bold text-on-primary transition-all hover:brightness-110 active:scale-95"
                >
                  Tambah ke Keranjang
                </button>
              </div>
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-6 text-headline-md">Diskon Pilihan</h2>

          {isLoading && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-3xl" />
              ))}
            </div>
          )}

          {!isLoading && (deals?.length ?? 0) === 0 && (
            <p className="py-16 text-center text-on-surface-variant">
              Belum ada promo aktif saat ini. Silakan kembali lagi minggu depan.
            </p>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {deals?.map((p) => (
              <article
                key={p.id}
                className="group flex flex-col overflow-hidden rounded-3xl glass-panel transition-all duration-300 hover:-translate-y-1"
              >
                <div className="relative h-48">
                  <img
                    src={p.image}
                    alt={p.alt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-secondary px-3 py-1 text-[10px] font-bold uppercase text-on-secondary">
                    -{p.discountPercent}%
                  </span>
                </div>
                <div className="flex flex-grow flex-col p-5">
                  <p className="mb-1 text-label-md text-secondary">{p.category}</p>
                  <h3 className="mb-3 text-[18px] font-semibold">{p.name}</h3>
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
                      className="flex h-10 w-10 items-center justify-center rounded-full primary-gradient text-on-primary transition-transform active:scale-90"
                    >
                      <Icon name="add_shopping_cart" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}

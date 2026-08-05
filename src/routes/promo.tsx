import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/components/cart-context";
import { useOutlet } from "@/components/outlet-context";
import { formatIDR } from "@/lib/utils";
import { getPromoProducts, getPromoRuleProducts } from "@/lib/erpnext/products";
import { useSiteSettings } from "@/hooks/use-site-settings";

export const Route = createFileRoute("/promo")({
  validateSearch: (search: Record<string, unknown>): { rule?: string } =>
    typeof search.rule === "string" ? { rule: search.rule } : {},
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
  const { selectedOutlet } = useOutlet();
  const { rule } = Route.useSearch();
  const warehouse = selectedOutlet?.warehouse ?? undefined;

  const allDeals = useQuery({
    queryKey: ["promo-products", warehouse],
    queryFn: () => getPromoProducts({ data: { warehouse } }),
    enabled: !rule,
  });

  const ruleDeals = useQuery({
    queryKey: ["promo-rule-products", rule, warehouse],
    queryFn: () => getPromoRuleProducts({ data: { ruleId: rule!, warehouse } }),
    enabled: Boolean(rule),
  });

  const isLoading = rule ? ruleDeals.isLoading : allDeals.isLoading;
  const deals = rule ? ruleDeals.data?.products : allDeals.data;
  const featured = !rule ? deals?.[0] : undefined;

  const settings = useSiteSettings();

  return (
    <SiteLayout>
      <div className="mx-auto max-w-container-max px-gutter pb-stack-lg">
        <header className="mb-stack-lg">
          {rule && (
            <Link
              to="/promo"
              className="mb-4 inline-block text-sm font-bold text-primary hover:underline"
            >
              ← Semua Promo
            </Link>
          )}
          <h1 className="font-display text-headline-lg-mobile md:text-display-lg">
            {settings.promoPageHeading}
          </h1>
          <p className="mt-2 max-w-2xl text-body-lg text-on-surface-variant">
            {settings.promoPageSubtext}
          </p>
          {selectedOutlet && (
            <p className="mt-2 flex items-center gap-2 text-body-sm font-bold text-primary">
              <Icon name="storefront" className="text-[16px]" />
              Menampilkan promo yang stoknya tersedia di {selectedOutlet.name}
            </p>
          )}
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

        <Reveal>
          <section>
            <h2 className="mb-6 text-headline-md">Diskon Pilihan</h2>

            {isLoading && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-56 rounded-2xl" />
                ))}
              </div>
            )}

            {!isLoading && (deals?.length ?? 0) === 0 && (
              <p className="py-16 text-center text-on-surface-variant">
                {rule
                  ? "Promo ini tidak menyasar produk spesifik."
                  : "Belum ada promo aktif saat ini. Silakan kembali lagi minggu depan."}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {deals?.map((p) => (
                <article
                  key={p.id}
                  className="group flex flex-col overflow-hidden rounded-2xl glass-panel transition-all duration-300 hover:-translate-y-1 hover:shadow-glass-lg"
                >
                  <div className="relative aspect-square">
                    <img
                      src={p.image}
                      alt={p.alt}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute left-2 top-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-on-secondary">
                      -{p.discountPercent}%
                    </span>
                  </div>
                  <div className="flex flex-grow flex-col p-3">
                    <p className="mb-1 truncate text-[11px] text-secondary">{p.category}</p>
                    <h3 className="mb-2 line-clamp-2 text-[14px] font-semibold leading-tight">
                      {p.name}
                    </h3>
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="font-display text-[14px] font-bold text-primary">
                          {formatIDR(p.price)}
                        </span>
                        <span className="text-[11px] text-on-surface-variant line-through">
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
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full primary-gradient text-on-primary transition-transform active:scale-90"
                      >
                        <Icon name="add_shopping_cart" className="text-[16px]" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </Reveal>
      </div>
    </SiteLayout>
  );
}

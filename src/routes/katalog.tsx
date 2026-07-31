import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { Icon } from "@/components/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/components/cart-context";
import { formatIDR } from "@/lib/utils";
import { getItemGroups, getProducts, type ProductQuery } from "@/lib/erpnext/products";

export const Route = createFileRoute("/katalog")({
  head: () => ({
    meta: [
      { title: "Katalog Produk | X-SHA Tasikmalaya" },
      {
        name: "description",
        content:
          "Jelajahi katalog X-SHA: batik, tenun, aksesoris kulit, anyaman, kopi Galunggung, dan kelom geulis dengan filter kategori.",
      },
      { property: "og:title", content: "Katalog Produk | X-SHA Tasikmalaya" },
      {
        property: "og:description",
        content: "Filter kategori, cari produk, dan pesan langsung lewat WhatsApp.",
      },
    ],
  }),
  component: Katalog,
});

const PAGE_SIZE = 12;

function Katalog() {
  const { add } = useCart();
  const [query, setQuery] = useState("");
  const [itemGroup, setItemGroup] = useState("");
  const [sort, setSort] = useState<ProductQuery["sort"]>("relevance");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);

  const { data: itemGroups } = useQuery({
    queryKey: ["item-groups"],
    queryFn: () => getItemGroups(),
    staleTime: 10 * 60_000,
  });

  const productQuery: ProductQuery = useMemo(
    () => ({
      search: query || undefined,
      itemGroup: itemGroup || undefined,
      sort,
      page,
      pageSize: PAGE_SIZE,
    }),
    [query, itemGroup, sort, page],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["products", productQuery],
    queryFn: () => getProducts({ data: productQuery }),
  });

  const products = data?.products ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const reset = () => {
    setQuery("");
    setItemGroup("");
    setSort("relevance");
    setPage(1);
  };

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-container-max px-gutter pb-stack-lg">
        <div className="flex flex-col gap-gutter md:flex-row">
          <aside className="flex h-fit w-full flex-col gap-stack-sm rounded-xl glass-panel p-stack-md md:w-64">
            <div className="mb-4">
              <h1 className="text-headline-md text-primary">Katalog Filter</h1>
              <p className="text-body-md text-on-surface-variant">Temukan kebutuhan Anda</p>
            </div>

            <div className="relative mb-4">
              <label className="sr-only" htmlFor="cari">
                Cari produk
              </label>
              <input
                id="cari"
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari produk..."
                className="w-full rounded-lg border border-white/30 bg-white/50 px-4 py-2 outline-none transition-all placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary"
              />
              <Icon
                name="search"
                className="pointer-events-none absolute right-3 top-2.5 text-on-surface-variant/50"
              />
            </div>

            <div className="mb-6 flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-label-md text-primary" htmlFor="kategori">
                  Kategori
                </label>
                <select
                  id="kategori"
                  value={itemGroup}
                  onChange={(e) => {
                    setItemGroup(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-white/30 bg-white/50 px-3 py-2 text-body-md outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Semua Kategori</option>
                  {itemGroups?.map((g) => (
                    <option key={g.name} value={g.name}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <nav className="mb-6 flex flex-col gap-1">
              {[
                { icon: "grid_view", label: "Relevan" as const, value: "relevance" as const },
                { icon: "arrow_upward", label: "Harga Terendah", value: "price_asc" as const },
                { icon: "arrow_downward", label: "Harga Tertinggi", value: "price_desc" as const },
              ].map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => {
                    setSort(f.value);
                    setPage(1);
                  }}
                  className={`flex items-center gap-3 rounded-lg p-3 text-left transition-all ${
                    sort === f.value
                      ? "bg-primary-container text-on-primary-container"
                      : "text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  <Icon name={f.icon} />
                  <span className="text-body-md">{f.label}</span>
                </button>
              ))}
            </nav>

            <button
              type="button"
              onClick={reset}
              className="w-full rounded-lg border border-primary py-3 font-bold text-primary transition-all hover:bg-primary hover:text-on-primary active:scale-95"
            >
              Reset Filter
            </button>
          </aside>

          <div className="flex-grow">
            <div className="mb-stack-md flex items-center justify-between rounded-xl glass-panel p-4">
              <div className="text-body-md font-semibold text-on-surface-variant">
                Menampilkan <span className="text-primary">{total}</span> Produk
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/20 p-1">
                {(["grid", "list"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-label={v === "grid" ? "Tampilan grid" : "Tampilan daftar"}
                    onClick={() => setView(v)}
                    className={`rounded-md p-2 transition-all ${
                      view === v
                        ? "bg-primary-container text-on-primary"
                        : "text-on-surface-variant hover:bg-white/40"
                    }`}
                  >
                    <Icon name={v === "grid" ? "grid_view" : "format_list_bulleted"} />
                  </button>
                ))}
              </div>
            </div>

            <div
              className={
                view === "grid"
                  ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                  : "flex flex-col gap-4"
              }
            >
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className={view === "grid" ? "aspect-square rounded-3xl" : "h-32 rounded-3xl"}
                  />
                ))}

              {!isLoading &&
                products.map((p) => (
                  <article
                    key={p.id}
                    className={`group rounded-3xl glass-panel p-4 transition-all duration-300 hover:-translate-y-1 ${
                      view === "grid" ? "flex flex-col" : "flex gap-6"
                    }`}
                  >
                    <div
                      className={`overflow-hidden rounded-2xl product-card-image ${
                        view === "grid" ? "mb-4 aspect-square" : "h-32 w-32 shrink-0"
                      }`}
                    >
                      <img
                        src={p.image}
                        alt={p.alt}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="flex flex-grow flex-col">
                      <p className="mb-1 text-label-md text-secondary">{p.category}</p>
                      <h2 className="mb-2 text-headline-md text-on-surface">{p.name}</h2>
                      <div className="mt-auto flex items-center justify-between">
                        <span className="font-display text-price-display text-primary">
                          {formatIDR(p.price)}
                        </span>
                        <button
                          type="button"
                          aria-label={`Tambah ${p.name} ke keranjang`}
                          onClick={() =>
                            add({
                              id: p.id,
                              name: p.name,
                              price: p.price,
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

            {!isLoading && products.length === 0 && (
              <p className="py-16 text-center text-on-surface-variant">
                Tidak ada produk yang cocok dengan pencarian Anda.
              </p>
            )}

            {totalPages > 1 && (
              <div className="mt-stack-lg flex items-center justify-center gap-2">
                <button
                  type="button"
                  aria-label="Halaman sebelumnya"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/30 text-on-surface-variant transition-all hover:bg-white/40 disabled:opacity-40"
                >
                  <Icon name="chevron_left" />
                </button>
                <span className="px-4 text-on-surface-variant">
                  Halaman {page} dari {totalPages}
                </span>
                <button
                  type="button"
                  aria-label="Halaman berikutnya"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/30 text-on-surface-variant transition-all hover:bg-white/40 disabled:opacity-40"
                >
                  <Icon name="chevron_right" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

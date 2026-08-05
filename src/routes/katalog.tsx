import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { Icon } from "@/components/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/components/cart-context";
import { useOutlet } from "@/components/outlet-context";
import { formatIDR } from "@/lib/utils";
import { getItemGroupChildren, getProducts, type ProductQuery } from "@/lib/erpnext/products";
import { useSiteSettings } from "@/hooks/use-site-settings";

export const Route = createFileRoute("/katalog")({
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search.q === "string" ? { q: search.q } : {},
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
        content:
          "Filter departemen, kategori, dan sub kategori, cari produk, dan pesan langsung lewat WhatsApp.",
      },
    ],
  }),
  component: Katalog,
});

const PAGE_SIZE = 12;

function Katalog() {
  const { add } = useCart();
  const { selectedOutlet } = useOutlet();
  const { q } = Route.useSearch();
  const [query, setQuery] = useState(q ?? "");
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [sort, setSort] = useState<ProductQuery["sort"]>("relevance");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);

  const settings = useSiteSettings();

  // The outlet filter itself lives in the top-nav bar (applies to katalog
  // and promo alike) — this page just reacts to it and resets pagination.
  useEffect(() => {
    setPage(1);
  }, [selectedOutlet]);

  // Keep the search box in sync when arriving via the top-nav search (a new
  // /katalog?q=... navigation) rather than only reading it once on mount.
  useEffect(() => {
    if (q !== undefined) setQuery(q);
  }, [q]);

  const { data: departments } = useQuery({
    queryKey: ["item-groups", "root"],
    queryFn: () => getItemGroupChildren({ data: undefined }),
    staleTime: 10 * 60_000,
  });

  const { data: categories } = useQuery({
    queryKey: ["item-groups", department],
    queryFn: () => getItemGroupChildren({ data: { parent: department } }),
    enabled: department !== "",
    staleTime: 10 * 60_000,
  });

  const { data: subCategories } = useQuery({
    queryKey: ["item-groups", category],
    queryFn: () => getItemGroupChildren({ data: { parent: category } }),
    enabled: category !== "",
    staleTime: 10 * 60_000,
  });

  // Hierarchy dictates which node currently governs the product filter: the
  // deepest one picked wins, and its own `isGroup` decides how getProducts
  // matches it (exact leaf vs. "descendants of" branch).
  const selected =
    subCategories?.find((g) => g.name === subCategory) ??
    categories?.find((g) => g.name === category) ??
    departments?.find((g) => g.name === department);

  const productQuery: ProductQuery = useMemo(
    () => ({
      search: query || undefined,
      itemGroup: selected?.name,
      itemGroupIsGroup: selected?.isGroup,
      warehouse: selectedOutlet?.warehouse ?? undefined,
      sort,
      page,
      pageSize: PAGE_SIZE,
    }),
    [query, selected, selectedOutlet, sort, page],
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
    setDepartment("");
    setCategory("");
    setSubCategory("");
    setSort("relevance");
    setPage(1);
  };

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-container-max px-gutter pb-stack-lg">
        <div className="flex flex-col gap-gutter md:flex-row">
          <aside className="flex h-fit w-full flex-col gap-stack-sm rounded-xl glass-panel p-stack-md md:w-64">
            <div className="mb-4">
              <h1 className="text-headline-md text-primary">{settings.katalogPageHeading}</h1>
              <p className="text-body-md text-on-surface-variant">{settings.katalogPageSubtext}</p>
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
                <label className="mb-1 block text-label-md text-primary" htmlFor="departemen">
                  Departemen
                </label>
                <select
                  id="departemen"
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    setCategory("");
                    setSubCategory("");
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-white/30 bg-white/50 px-3 py-2 text-body-md outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Semua Departemen</option>
                  {departments?.map((g) => (
                    <option key={g.name} value={g.name}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-label-md text-primary" htmlFor="kategori">
                  Kategori
                </label>
                <select
                  id="kategori"
                  value={category}
                  disabled={!department}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setSubCategory("");
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-white/30 bg-white/50 px-3 py-2 text-body-md outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Semua Kategori</option>
                  {categories?.map((g) => (
                    <option key={g.name} value={g.name}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-label-md text-primary" htmlFor="sub-kategori">
                  Sub Kategori
                </label>
                <select
                  id="sub-kategori"
                  value={subCategory}
                  disabled={!category}
                  onChange={(e) => {
                    setSubCategory(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-white/30 bg-white/50 px-3 py-2 text-body-md outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Semua Sub Kategori</option>
                  {subCategories?.map((g) => (
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
            <div className="mb-stack-md flex flex-col gap-3 rounded-xl glass-panel p-4 sm:flex-row sm:items-center sm:justify-between">
              {selectedOutlet ? (
                <p className="flex items-center gap-2 text-body-md text-on-surface-variant">
                  <Icon name="storefront" className="text-primary" />
                  Menampilkan stok yang tersedia di{" "}
                  <span className="font-bold text-primary">{selectedOutlet.name}</span>
                </p>
              ) : (
                <p className="flex items-center gap-2 text-body-md text-on-surface-variant">
                  <Icon name="storefront" />
                  Pilih outlet di bar atas untuk cek stok per lokasi
                </p>
              )}

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
                  ? "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
                  : "flex flex-col gap-3"
              }
            >
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className={view === "grid" ? "aspect-square rounded-2xl" : "h-24 rounded-2xl"}
                  />
                ))}

              {!isLoading &&
                products.map((p) => (
                  <article
                    key={p.id}
                    className={`group rounded-2xl glass-panel p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-glass-lg ${
                      view === "grid" ? "flex flex-col" : "flex gap-4"
                    }`}
                  >
                    <div
                      className={`overflow-hidden rounded-xl product-card-image ${
                        view === "grid" ? "mb-3 aspect-square" : "h-24 w-24 shrink-0"
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
                      <p className="mb-1 truncate text-[11px] text-secondary">{p.category}</p>
                      <h2 className="mb-2 line-clamp-2 text-[14px] font-semibold leading-tight text-on-surface">
                        {p.name}
                      </h2>
                      <div className="mt-auto flex items-center justify-between gap-2">
                        <span className="font-display text-[14px] font-bold text-primary">
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
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full primary-gradient text-on-primary transition-transform active:scale-90"
                        >
                          <Icon name="add_shopping_cart" className="text-[16px]" />
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

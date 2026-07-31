import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { SiteLayout } from "@/components/site-layout";
import { Icon } from "@/components/icon";
import { useAuth, AUTH_QUERY_KEY } from "@/hooks/use-auth";
import { IMG } from "@/lib/catalog-data";
import { formatIDR } from "@/lib/utils";
import { logoutCustomer } from "@/lib/erpnext/auth";
import { getMyLoyaltyStatus } from "@/lib/erpnext/loyalty";
import { getMyOrders } from "@/lib/erpnext/orders";
import { getPromoProducts } from "@/lib/erpnext/products";

export const Route = createFileRoute("/member")({
  head: () => ({
    meta: [
      { title: "Member Dashboard | X-SHA Loyalty" },
      {
        name: "description",
        content:
          "Kartu member digital, saldo poin loyalitas, promo khusus member, dan riwayat transaksi X-SHA dalam satu dashboard.",
      },
      { property: "og:title", content: "Member Dashboard | X-SHA Loyalty" },
      {
        property: "og:description",
        content: "Pantau poin, tukarkan promo eksklusif, dan lihat transaksi terakhir Anda.",
      },
    ],
  }),
  component: MemberDashboard,
});

const sideMenu = [
  { icon: "dashboard", label: "Dashboard", active: true },
  { icon: "stars", label: "Poin" },
  { icon: "receipt_long", label: "Transaksi" },
  { icon: "sell", label: "Promo" },
];

function MemberDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, isLoggedIn } = useAuth();

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      navigate({ to: "/login" });
    }
  }, [authLoading, isLoggedIn, navigate]);

  const { data: loyalty } = useQuery({
    queryKey: ["loyalty-status"],
    queryFn: () => getMyLoyaltyStatus(),
    enabled: isLoggedIn,
  });

  const { data: orders } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => getMyOrders(),
    enabled: isLoggedIn,
  });

  const { data: promos } = useQuery({
    queryKey: ["promo-products"],
    queryFn: () => getPromoProducts(),
  });

  const handleLogout = async () => {
    await logoutCustomer();
    await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    navigate({ to: "/" });
  };

  if (!isLoggedIn) return null;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-container-max px-gutter pb-stack-lg">
        <div className="flex flex-col gap-gutter md:flex-row">
          <aside className="w-full shrink-0 md:w-64">
            <nav className="flex flex-col gap-2 rounded-xl glass-panel p-4">
              <div className="mb-2 px-4 py-2">
                <h1 className="text-headline-md text-primary">Member Area</h1>
                <p className="text-xs text-on-surface-variant">Heritage of Tasikmalaya</p>
              </div>
              {sideMenu.map((m) => (
                <span
                  key={m.label}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-label-md transition-all ${
                    m.active
                      ? "bg-primary-container text-on-primary-container"
                      : "text-on-surface-variant"
                  }`}
                >
                  <Icon name={m.icon} filled={m.active} />
                  {m.label}
                </span>
              ))}
              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 flex items-center gap-3 rounded-lg px-4 py-3 text-left text-label-md text-error transition-all hover:bg-error/5"
              >
                <Icon name="logout" />
                Keluar
              </button>
              {loyalty?.level && (
                <div className="mt-8 rounded-xl border border-primary/10 bg-primary/5 px-4 py-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                    Status Level
                  </p>
                  <p className="text-headline-md text-on-surface">{loyalty.level}</p>
                </div>
              )}
            </nav>
          </aside>

          <div className="flex flex-1 flex-col gap-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="relative flex aspect-[1.6/1] flex-col justify-between rounded-[24px] member-card-gradient p-8 text-on-primary shadow-2xl md:aspect-auto md:h-64 lg:col-span-2">
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] opacity-80">
                      Loyalty Member
                    </p>
                    <h2 className="text-headline-lg text-on-primary">X-SHA EXCLUSIVE</h2>
                  </div>
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white p-2">
                    <img
                      src={IMG.qrLarge}
                      alt="Kode QR kartu member digital X-SHA"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
                <div className="relative z-10 flex items-end justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="text-headline-md leading-none">
                      {user?.customer?.name ?? user?.email}
                    </p>
                    <p className="font-mono text-sm tracking-widest opacity-90">
                      {user?.customer?.id}
                    </p>
                  </div>
                  <Icon name="contactless" className="text-4xl opacity-50" />
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-2 rounded-[24px] border-primary/20 glass-panel p-8 text-center">
                <Icon name="stars" filled className="mb-2 text-5xl text-primary" />
                <p className="text-label-md text-on-surface-variant">Saldo Poin Anda</p>
                <p className="font-display text-display-lg text-primary">{loyalty?.points ?? 0}</p>
                {!loyalty?.loyaltyProgram && (
                  <p className="mb-4 rounded-full bg-surface-container px-4 py-1.5 text-xs text-on-surface-variant">
                    Belum terdaftar di program loyalitas
                  </p>
                )}
              </div>
            </div>

            <section>
              <div className="mb-6 flex items-end justify-between">
                <div>
                  <h2 className="text-headline-md text-on-surface">Promo Khusus Member</h2>
                  <p className="text-on-surface-variant">
                    Penawaran spesial hanya untuk Anda minggu ini.
                  </p>
                </div>
                <Link to="/promo" className="font-bold text-primary hover:underline">
                  Lihat Semua
                </Link>
              </div>
              {(promos?.length ?? 0) === 0 ? (
                <p className="rounded-xl glass-panel p-6 text-center text-on-surface-variant">
                  Belum ada promo aktif saat ini.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {promos?.slice(0, 3).map((p) => (
                    <article
                      key={p.id}
                      className="overflow-hidden rounded-[24px] glass-panel transition-transform hover:scale-[1.02]"
                    >
                      <div className="relative h-48">
                        <img
                          src={p.image}
                          alt={p.alt}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-tertiary-container px-3 py-1 text-[10px] font-bold uppercase text-on-tertiary-container">
                          <Icon name="verified" className="text-[14px]" />
                          Promo
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="mb-1 text-label-md">{p.name}</h3>
                        <div className="mb-4 flex items-center gap-2">
                          <span className="font-display text-price-display text-primary">
                            {formatIDR(p.price)}
                          </span>
                          <span className="text-xs text-on-surface-variant line-through">
                            {formatIDR(p.oldPrice)}
                          </span>
                        </div>
                        <Link
                          to="/promo"
                          className="block w-full rounded-xl bg-primary py-2.5 text-center font-bold text-on-primary transition-colors hover:bg-primary/90"
                        >
                          Lihat Promo
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-headline-md text-on-surface">Transaksi Terakhir</h2>
              </div>
              {(orders?.length ?? 0) === 0 ? (
                <p className="rounded-[24px] glass-panel p-6 text-center text-on-surface-variant">
                  Belum ada transaksi.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-[24px] glass-panel">
                  <table className="w-full text-left">
                    <thead className="bg-primary/5">
                      <tr>
                        <th className="px-6 py-4 text-label-md text-on-surface-variant">Tanggal</th>
                        <th className="px-6 py-4 text-label-md text-on-surface-variant">
                          No. Pesanan
                        </th>
                        <th className="px-6 py-4 text-right text-label-md text-on-surface-variant">
                          Total
                        </th>
                        <th className="px-6 py-4 text-center text-label-md text-on-surface-variant">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {orders?.map((t) => (
                        <tr key={t.id} className="transition-colors hover:bg-white/10">
                          <td className="whitespace-nowrap px-6 py-4 text-sm">{t.date}</td>
                          <td className="px-6 py-4 text-sm font-semibold">{t.id}</td>
                          <td className="whitespace-nowrap px-6 py-4 text-right font-display text-sm font-extrabold">
                            {formatIDR(t.total)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="rounded-full bg-success-container px-3 py-1 text-[10px] font-bold uppercase text-success">
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <a
                href="https://wa.me/6288299633581"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-xl border-primary/10 glass-panel p-6 transition-colors hover:bg-white/40"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon name="help_outline" />
                </div>
                <div>
                  <p className="font-bold text-on-surface">Butuh Bantuan?</p>
                  <p className="text-sm text-on-surface-variant">
                    Hubungi Customer Service kami via WhatsApp.
                  </p>
                </div>
              </a>
              <div className="flex items-center gap-4 rounded-xl border-primary/10 glass-panel p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                  <Icon name="map" />
                </div>
                <div>
                  <p className="font-bold text-on-surface">16+ Outlets</p>
                  <p className="text-sm text-on-surface-variant">
                    Cari toko X-SHA terdekat di kota Anda.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

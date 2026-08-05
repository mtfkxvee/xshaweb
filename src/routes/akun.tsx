import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { SiteLayout } from "@/components/site-layout";
import { Icon } from "@/components/icon";
import { AnimatedNumber } from "@/components/animated-number";
import { Reveal } from "@/components/reveal";
import { useAuth, AUTH_QUERY_KEY } from "@/hooks/use-auth";
import { IMG } from "@/lib/catalog-data";
import { formatIDR } from "@/lib/utils";
import { logoutCustomer } from "@/lib/erpnext/auth";
import { getMyLoyaltyStatus } from "@/lib/erpnext/loyalty";
import { getMyOrders } from "@/lib/erpnext/orders";
import { getPromoProducts } from "@/lib/erpnext/products";
import { useSiteSettings } from "@/hooks/use-site-settings";

export const Route = createFileRoute("/akun")({
  head: () => ({
    meta: [
      { title: "Akun Saya | X-SHA" },
      {
        name: "description",
        content:
          "Kartu member digital, saldo poin loyalitas, promo khusus member, dan riwayat transaksi X-SHA.",
      },
      { property: "og:title", content: "Akun Saya | X-SHA" },
      {
        property: "og:description",
        content: "Tunjukkan QR member Anda di kasir dan pantau poin loyalitas X-SHA.",
      },
    ],
  }),
  component: Akun,
});

function Akun() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, isLoggedIn } = useAuth();

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      navigate({ to: "/login" });
    }
  }, [authLoading, isLoggedIn, navigate]);

  // Per-customer data — always refetch on mount, never served from the
  // cross-page React Query cache window (matches the server's no-store).
  const { data: loyalty } = useQuery({
    queryKey: ["loyalty-status"],
    queryFn: () => getMyLoyaltyStatus(),
    enabled: isLoggedIn,
    staleTime: 0,
  });

  const { data: orders } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => getMyOrders(),
    enabled: isLoggedIn,
    staleTime: 0,
  });

  const { data: promos } = useQuery({
    queryKey: ["promo-products"],
    queryFn: () => getPromoProducts(),
  });

  const settings = useSiteSettings();

  const handleLogout = async () => {
    await logoutCustomer();
    queryClient.setQueryData(AUTH_QUERY_KEY, null);
    navigate({ to: "/" });
  };

  if (!isLoggedIn) return null;

  const displayName = user?.customer?.name ?? user?.email ?? "";

  return (
    <SiteLayout>
      <div className="mx-auto max-w-container-max px-gutter pb-stack-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-headline-lg-mobile text-on-surface md:text-display-lg">
              Akun Saya
            </h1>
            <p className="text-label-md text-on-surface-variant">
              Halo, <span className="font-bold text-primary">{displayName}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/profil"
              className="flex items-center gap-2 rounded-xl border border-primary/30 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/5"
            >
              <Icon name="person_edit" className="text-[18px]" />
              <span className="hidden sm:inline">Edit Profil</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl border border-error/30 px-4 py-2 text-sm font-bold text-error transition-colors hover:bg-error/5"
            >
              <Icon name="logout" className="text-[18px]" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="relative flex aspect-[1.6/1] flex-col justify-between rounded-[24px] member-card-gradient p-6 text-on-primary shadow-2xl md:aspect-auto md:h-64 md:p-8 md:col-span-2">
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 md:text-xs">
                  {loyalty?.level ?? "Member"}
                </p>
                <h2 className="text-headline-md uppercase leading-tight text-on-primary md:text-headline-lg">
                  {displayName}
                </h2>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white p-2 md:h-16 md:w-16">
                <img
                  src={IMG.qrLarge}
                  alt="Kode QR kartu member digital X-SHA"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
            <div className="relative z-10 flex items-end justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] opacity-70">Member ID</p>
                <p className="font-mono text-sm tracking-widest opacity-90 md:text-base">
                  {user?.customer?.id}
                </p>
              </div>
              <Icon name="contactless" className="text-3xl opacity-50 md:text-4xl" />
            </div>
            <div className="pointer-events-none absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          </div>

          <div className="flex flex-col items-center justify-center gap-2 rounded-[24px] border-primary/20 glass-panel p-6 text-center md:p-8">
            <Icon name="stars" filled className="mb-2 text-4xl text-primary md:text-5xl" />
            <p className="text-label-md text-on-surface-variant">Saldo Poin Anda</p>
            <p className="font-display text-display-lg text-primary">
              <AnimatedNumber value={loyalty?.points ?? 0} />
            </p>
            {!loyalty?.loyaltyProgram && (
              <p className="mt-2 rounded-full bg-surface-container px-4 py-1.5 text-xs text-on-surface-variant">
                Belum terdaftar di program loyalitas
              </p>
            )}
          </div>
        </div>

        <Reveal>
          <section className="mt-stack-lg">
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
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {promos?.slice(0, 4).map((p) => (
                  <Link
                    key={p.id}
                    to="/promo"
                    className="group overflow-hidden rounded-2xl glass-panel transition-transform hover:scale-[1.02]"
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
                    <div className="p-3">
                      <h3 className="mb-1 line-clamp-2 text-[13px] font-semibold leading-tight">
                        {p.name}
                      </h3>
                      <span className="font-display text-[14px] font-bold text-primary">
                        {formatIDR(p.price)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </Reveal>

        <Reveal>
          <section className="mt-stack-lg">
            <h2 className="mb-6 text-headline-md text-on-surface">Riwayat Transaksi</h2>
            {(orders?.length ?? 0) === 0 ? (
              <p className="rounded-[24px] glass-panel p-6 text-center text-on-surface-variant">
                Belum ada transaksi.
              </p>
            ) : (
              <div className="overflow-hidden rounded-[24px] glass-panel">
                {/* Table on md+, stacked cards on mobile — a <table> forces
                  horizontal scroll on narrow screens which is awkward here. */}
                <div className="hidden overflow-x-auto md:block">
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
                <div className="divide-y divide-white/20 md:hidden">
                  {orders?.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-sm font-semibold">{t.id}</p>
                        <p className="text-xs text-on-surface-variant">{t.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-sm font-extrabold">{formatIDR(t.total)}</p>
                        <span className="rounded-full bg-success-container px-2 py-0.5 text-[10px] font-bold uppercase text-success">
                          {t.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </Reveal>

        <div className="mt-stack-lg grid grid-cols-1 gap-6 md:grid-cols-2">
          <a
            href={`https://wa.me/${settings.whatsappNumber}`}
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
          <Link
            to="/kontak"
            className="flex items-center gap-4 rounded-xl border-primary/10 glass-panel p-6 transition-colors hover:bg-white/40"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10 text-secondary">
              <Icon name="map" />
            </div>
            <div>
              <p className="font-bold text-on-surface">16+ Outlets</p>
              <p className="text-sm text-on-surface-variant">
                Cari toko X-SHA terdekat di kota Anda.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </SiteLayout>
  );
}

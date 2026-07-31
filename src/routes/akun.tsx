import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Icon } from "@/components/icon";
import { useCart } from "@/components/cart-context";
import { useAuth, AUTH_QUERY_KEY } from "@/hooks/use-auth";
import { IMG } from "@/lib/catalog-data";
import { logoutCustomer } from "@/lib/erpnext/auth";
import { getMyLoyaltyStatus } from "@/lib/erpnext/loyalty";

export const Route = createFileRoute("/akun")({
  head: () => ({
    meta: [
      { title: "Akun Member | X-SHA Mobile" },
      {
        name: "description",
        content:
          "Kartu member digital, poin, voucher, riwayat transaksi, dan pengaturan akun X-SHA dalam tampilan mobile.",
      },
      { property: "og:title", content: "Akun Member | X-SHA Mobile" },
      {
        property: "og:description",
        content: "Tunjukkan QR member Anda di kasir dan kumpulkan poin di 16+ outlet X-SHA.",
      },
    ],
  }),
  component: AkunMobile,
});

const menu = [
  { icon: "stars", label: "Poin & Reward", to: "/member" as const },
  { icon: "receipt_long", label: "Riwayat Transaksi", to: "/member" as const },
  { icon: "sell", label: "Promo Member", to: "/promo" as const },
];

function AkunMobile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { openCart } = useCart();
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

  const handleLogout = async () => {
    await logoutCustomer();
    await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    navigate({ to: "/" });
  };

  if (!isLoggedIn) return null;

  const displayName = user?.customer?.name ?? user?.email ?? "";

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed -left-16 top-20 -z-10 h-64 w-64 rounded-full bg-primary/5 blur-[80px]" />
      <div className="pointer-events-none fixed -right-16 bottom-40 -z-10 h-80 w-80 rounded-full bg-secondary/5 blur-[100px]" />

      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between glass-bar border-b px-4">
        <Link to="/" className="font-display text-[24px] font-extrabold text-primary">
          X-SHA
        </Link>
        <div className="flex items-center gap-stack-sm">
          <button
            type="button"
            onClick={openCart}
            aria-label="Buka keranjang"
            className="flex h-10 w-10 items-center justify-center text-on-surface-variant transition-colors hover:text-primary"
          >
            <Icon name="shopping_cart" />
          </button>
          <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-primary/20 p-0.5">
            <img
              src={IMG.avatar}
              alt={`Foto profil ${displayName}`}
              className="h-full w-full rounded-full object-cover"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-6 px-4 pb-28 pt-20">
        <section className="flex flex-col gap-1">
          <h1 className="text-headline-lg-mobile text-on-surface">Member Akun</h1>
          <p className="text-label-md text-on-surface-variant">
            Halo, <span className="font-bold text-primary">{displayName}</span>
          </p>
        </section>

        <section className="relative rounded-2xl member-card-gradient p-6 text-on-primary shadow-xl animate-rise">
          <div className="relative z-10">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-on-primary/80">
                  {loyalty?.level ?? "Member"}
                </p>
                <h2 className="mt-1 text-headline-md leading-tight uppercase">{displayName}</h2>
              </div>
              <span className="font-display text-[18px] font-extrabold text-secondary-fixed">
                X-SHA
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-shrink-0 rounded-xl bg-white p-3 shadow-lg">
                <img src={IMG.qrMobile} alt="Kode QR member X-SHA" className="h-24 w-24" />
              </div>
              <div className="flex flex-grow flex-col items-end">
                <p className="text-[12px] text-on-primary/70">Member ID</p>
                <p className="font-display text-[20px] font-extrabold tracking-widest">
                  {user?.customer?.id}
                </p>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        </section>

        <section className="grid grid-cols-1 gap-4">
          <div className="flex flex-col items-center rounded-xl glass-panel p-4 text-center">
            <Icon name="stars" filled className="mb-2 text-primary" />
            <p className="text-[12px] text-on-surface-variant">Poin Saya</p>
            <p className="mt-1 font-display text-price-display text-primary">
              {loyalty?.points ?? 0}
            </p>
          </div>
        </section>

        <section className="divide-y divide-white/30 overflow-hidden rounded-2xl glass-panel">
          {menu.map((m) => (
            <Link
              key={m.label}
              to={m.to}
              className="flex h-[56px] items-center justify-between p-4 transition-colors active:bg-primary/5"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon name={m.icon} />
                </div>
                <span className="text-label-md text-on-surface">{m.label}</span>
              </div>
              <Icon name="chevron_right" className="text-[20px] text-on-surface-variant" />
            </Link>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-[56px] w-full items-center justify-between p-4 text-left transition-colors active:bg-error/5"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-error-container/50 text-error">
                <Icon name="logout" />
              </div>
              <span className="text-label-md text-error">Keluar</span>
            </div>
          </button>
        </section>

        <section className="flex items-center gap-4 rounded-2xl glass-panel p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary">
            <Icon name="storefront" />
          </div>
          <div>
            <h3 className="text-label-md text-on-surface">16+ Outlets Regional</h3>
            <p className="text-[12px] leading-tight text-on-surface-variant">
              Melayani Anda di Tasikmalaya &amp; sekitarnya sejak 2006.
            </p>
          </div>
        </section>
      </main>

      <nav className="fixed bottom-0 z-50 grid h-20 w-full grid-cols-4 items-center bg-white/60 px-4 backdrop-blur-xl">
        <Link
          to="/"
          className="flex flex-col items-center gap-1 text-on-surface-variant transition-colors"
        >
          <Icon name="home" />
          <span className="text-[10px] font-semibold">Beranda</span>
        </Link>
        <Link to="/katalog" className="flex flex-col items-center gap-1 text-on-surface-variant">
          <Icon name="grid_view" />
          <span className="text-[10px] font-semibold">Katalog</span>
        </Link>
        <Link to="/member" className="flex flex-col items-center gap-1 text-on-surface-variant">
          <Icon name="receipt" />
          <span className="text-[10px] font-semibold">Pesanan</span>
        </Link>
        <span className="flex flex-col items-center gap-1 text-primary">
          <Icon name="person" filled />
          <span className="text-[10px] font-bold">Akun</span>
        </span>
      </nav>
    </div>
  );
}

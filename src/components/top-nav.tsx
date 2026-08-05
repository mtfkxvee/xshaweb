import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Icon } from "./icon";
import { useCart } from "./cart-context";
import { useOutlet } from "./outlet-context";
import { useAuth } from "@/hooks/use-auth";

const links = [
  { to: "/", label: "Beranda" },
  { to: "/katalog", label: "Katalog" },
  { to: "/promo", label: "Promo" },
  { to: "/blog", label: "Blog" },
  { to: "/tentang", label: "Tentang Kami" },
  { to: "/kontak", label: "Kontak" },
] as const;

export function TopNav() {
  const { openCart, count, pulseKey } = useCart();
  const { isLoggedIn, user } = useAuth();
  const initial = user?.customer?.name?.trim().charAt(0).toUpperCase();
  const { outlets, outletCode, setOutletCode } = useOutlet();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/katalog", search: { q: search || undefined } });
    setMobileSearchOpen(false);
  };

  return (
    <header
      className={`fixed top-0 z-50 w-full glass-bar border-b transition-shadow duration-300 ${
        scrolled ? "shadow-glass-lg" : "shadow-glass"
      }`}
    >
      <div
        className={`mx-auto flex max-w-container-max items-center justify-between px-gutter transition-[height] duration-300 ${
          scrolled ? "h-14 md:h-16" : "h-16 md:h-20"
        }`}
      >
        <Link to="/" className="shrink-0">
          <img
            src="/xsha-logo.png"
            alt="X-SHA"
            className={`w-auto transition-all duration-300 ${scrolled ? "h-7 md:h-9" : "h-8 md:h-11"}`}
          />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="nav-underline py-1 text-label-md text-on-surface-variant transition-colors duration-300 hover:text-primary"
              activeProps={{
                className: "nav-underline-active py-1 text-label-md font-bold text-primary",
              }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="relative hidden md:block">
          <label htmlFor="nav-search" className="sr-only">
            Cari produk
          </label>
          <input
            id="nav-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk impian..."
            className="w-56 rounded-full border border-white/30 bg-white/50 py-2 pl-4 pr-9 text-sm outline-none transition-all placeholder:text-on-surface-variant/50 focus:w-64 focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            aria-label="Cari"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 transition-transform active:scale-90"
          >
            <Icon name="search" className="text-[20px]" />
          </button>
        </form>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((v) => !v)}
            aria-label="Cari produk"
            className="p-2 text-primary transition-transform active:scale-90 md:hidden"
          >
            <Icon name="search" />
          </button>
          <button
            type="button"
            onClick={openCart}
            aria-label="Buka keranjang belanja"
            className="relative p-2 text-primary transition-transform active:scale-90"
          >
            <Icon
              key={pulseKey}
              name="shopping_cart"
              className={pulseKey > 0 ? "animate-cart-bounce" : ""}
            />
            {count > 0 && (
              <span
                key={count}
                className="animate-pop absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-on-secondary"
              >
                {count}
              </span>
            )}
          </button>
          <Link
            to={isLoggedIn ? "/akun" : "/login"}
            aria-label={isLoggedIn ? "Akun member" : "Masuk member"}
            className="hidden p-2 text-primary transition-transform active:scale-90 md:block"
          >
            {isLoggedIn && initial ? (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-on-primary">
                {initial}
              </span>
            ) : (
              <Icon name="person" filled={isLoggedIn} />
            )}
          </Link>
        </div>
      </div>

      <div className="w-full border-t border-white/20 bg-white/30">
        <div className="mx-auto flex max-w-container-max items-center gap-2 px-gutter py-1.5">
          <Icon name="storefront" className="shrink-0 text-[16px] text-primary" />
          <label htmlFor="nav-outlet" className="sr-only">
            Cek stok &amp; promo di outlet
          </label>
          <span className="hidden shrink-0 text-[12px] font-semibold text-on-surface-variant sm:inline">
            Cek stok &amp; promo di outlet:
          </span>
          <select
            id="nav-outlet"
            value={outletCode}
            onChange={(e) => setOutletCode(e.target.value)}
            className="min-w-0 flex-1 rounded-md border-none bg-transparent text-[12px] font-bold text-primary outline-none sm:max-w-xs"
          >
            <option value="">Semua Outlet</option>
            {outlets.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {mobileSearchOpen && (
        <form
          onSubmit={submitSearch}
          className="animate-rise glass-bar absolute left-0 top-full w-full border-t border-white/20 px-gutter py-3 shadow-glass md:hidden"
        >
          <div className="relative">
            <label htmlFor="nav-search-mobile" className="sr-only">
              Cari produk
            </label>
            <input
              id="nav-search-mobile"
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk impian..."
              className="w-full rounded-full border border-white/30 bg-white/50 py-2 pl-4 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              aria-label="Cari"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60"
            >
              <Icon name="search" className="text-[20px]" />
            </button>
          </div>
        </form>
      )}
    </header>
  );
}

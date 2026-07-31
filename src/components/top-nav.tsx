import { Link } from "@tanstack/react-router";
import { Icon } from "./icon";
import { useCart } from "./cart-context";
import { useAuth } from "@/hooks/use-auth";

const links = [
  { to: "/", label: "Beranda" },
  { to: "/katalog", label: "Katalog" },
  { to: "/promo", label: "Promo" },
  { to: "/tentang", label: "Tentang Kami" },
  { to: "/member", label: "Member" },
] as const;

export function TopNav() {
  const { openCart, count } = useCart();
  const { isLoggedIn } = useAuth();

  return (
    <header className="fixed top-0 z-50 w-full glass-bar border-b shadow-glass">
      <div className="mx-auto flex h-20 max-w-container-max items-center justify-between px-gutter">
        <Link
          to="/"
          className="font-display text-[28px] font-extrabold tracking-tight text-primary md:text-display-lg"
        >
          X-SHA
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-label-md text-on-surface-variant transition-colors duration-300 hover:text-secondary"
              activeProps={{
                className: "text-primary font-bold border-b-2 border-primary",
              }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCart}
            aria-label="Buka keranjang belanja"
            className="relative p-2 text-primary transition-transform active:scale-95"
          >
            <Icon name="shopping_cart" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-on-secondary">
                {count}
              </span>
            )}
          </button>
          <Link
            to={isLoggedIn ? "/akun" : "/login"}
            aria-label={isLoggedIn ? "Akun member" : "Masuk member"}
            className="p-2 text-primary transition-transform active:scale-95"
          >
            <Icon name="person" filled={isLoggedIn} />
          </Link>
        </div>
      </div>
    </header>
  );
}

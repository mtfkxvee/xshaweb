import { Link } from "@tanstack/react-router";
import { Icon } from "./icon";
import { useAuth } from "@/hooks/use-auth";

export function MobileBottomNav() {
  const { isLoggedIn, user } = useAuth();
  const initial = user?.customer?.name?.trim().charAt(0).toUpperCase();

  const profileTo = isLoggedIn ? ("/akun" as const) : ("/login" as const);

  const items = [
    { to: "/" as const, icon: "home", label: "Beranda", exact: true },
    { to: "/katalog" as const, icon: "grid_view", label: "Katalog", exact: false },
    { to: "/promo" as const, icon: "sell", label: "Promo", exact: false },
    { to: profileTo, icon: "person", label: "Profil", exact: false, isProfile: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 z-50 grid h-16 w-full grid-cols-4 items-center border-t border-white/30 bg-white/80 backdrop-blur-xl md:hidden">
      {items.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          activeOptions={{ exact: item.exact }}
          className="flex flex-col items-center gap-1 text-on-surface-variant transition-colors duration-200 active:scale-90"
          activeProps={{
            className:
              "flex flex-col items-center gap-1 text-primary transition-colors duration-200 active:scale-90",
          }}
        >
          {({ isActive }: { isActive: boolean }) => (
            <>
              {item.isProfile && isLoggedIn && initial ? (
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold transition-transform duration-300 ${
                    isActive
                      ? "scale-110 bg-primary text-on-primary"
                      : "bg-primary/70 text-on-primary"
                  }`}
                >
                  {initial}
                </span>
              ) : (
                <Icon
                  name={item.icon}
                  filled={isActive}
                  className={`transition-transform duration-300 ${isActive ? "scale-110" : "scale-100"}`}
                />
              )}
              <span className="text-[10px] font-semibold">{item.label}</span>
            </>
          )}
        </Link>
      ))}
    </nav>
  );
}

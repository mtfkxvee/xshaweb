import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Icon } from "./icon";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { useSiteSettings } from "@/hooks/use-site-settings";

const links = [
  { to: "/" as const, label: "Beranda", exact: true },
  { to: "/katalog" as const, label: "Katalog", exact: false },
  { to: "/promo" as const, label: "Promo", exact: false },
  { to: "/blog" as const, label: "Blog", exact: false },
  { to: "/tentang" as const, label: "Tentang Kami", exact: false },
  { to: "/karir" as const, label: "Karir", exact: false },
  { to: "/kontak" as const, label: "Kontak", exact: false },
];

// Every page the full desktop nav (top-nav.tsx, hidden below `lg`) can reach
// is also reachable here — the mobile bottom nav only surfaces 4 of them, so
// below `lg` this drawer is the only way to get to Blog/Tentang Kami/Karir/
// Kontak (and to the contact/social info the footer carries) without
// scrolling to the very bottom of every page.
export function MobileNavDrawer() {
  const [open, setOpen] = useState(false);
  const settings = useSiteSettings();
  const { isLoggedIn } = useAuth();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Buka menu navigasi"
          className="p-2 text-primary transition-transform active:scale-90 lg:hidden"
        >
          <Icon name="menu" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-4/5 max-w-xs flex-col gap-0 overflow-y-auto bg-surface p-0 text-on-surface"
      >
        <SheetTitle className="sr-only">Menu navigasi</SheetTitle>

        <nav className="mt-10 flex flex-col divide-y divide-outline-variant/40 border-b border-outline-variant/40">
          {links.map((l) => (
            <SheetClose asChild key={l.to}>
              <Link
                to={l.to}
                activeOptions={{ exact: l.exact }}
                activeProps={{ className: "font-bold text-primary" }}
                className="px-6 py-4 text-body-lg text-on-surface transition-colors hover:text-primary"
              >
                {l.label}
              </Link>
            </SheetClose>
          ))}
          <SheetClose asChild>
            <Link
              to={isLoggedIn ? "/akun" : "/login"}
              className="px-6 py-4 text-body-lg text-on-surface transition-colors hover:text-primary"
            >
              {isLoggedIn ? "Akun Saya" : "Masuk / Daftar"}
            </Link>
          </SheetClose>
        </nav>

        <div className="flex flex-col gap-3 px-6 py-6">
          <h3 className="text-label-md font-semibold text-primary">Kontak</h3>
          <div className="flex items-start gap-2 text-sm text-on-surface-variant">
            <Icon name="location_on" className="mt-0.5 shrink-0 text-[18px] text-primary" />
            {settings.hqAddress}
          </div>
          <a
            href={`mailto:${settings.contactEmail}`}
            className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary"
          >
            <Icon name="mail" className="text-[18px] text-primary" />
            {settings.contactEmail}
          </a>
          <a
            href={`tel:+${settings.whatsappNumber}`}
            className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary"
          >
            <Icon name="call" className="text-[18px] text-primary" />
            {settings.contactPhoneDisplay}
          </a>
        </div>

        <div className="flex flex-col gap-3 px-6 pb-6">
          <h3 className="text-label-md font-semibold text-primary">Ikuti Kami</h3>
          <div className="flex gap-3">
            <a
              href={settings.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ikuti X-SHA di Instagram"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-all hover:bg-primary hover:text-on-primary"
            >
              <Icon name="photo_camera" />
            </a>
            <a
              href={settings.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ikuti X-SHA di YouTube"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-all hover:bg-primary hover:text-on-primary"
            >
              <Icon name="smart_display" />
            </a>
          </div>
        </div>

        <p className="mt-auto px-6 pb-6 text-xs text-on-surface-variant">
          © {new Date().getFullYear()} {settings.copyrightSuffix}
        </p>
      </SheetContent>
    </Sheet>
  );
}

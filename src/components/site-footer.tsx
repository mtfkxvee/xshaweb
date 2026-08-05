import { Link } from "@tanstack/react-router";
import { Icon } from "./icon";
import { useSiteSettings } from "@/hooks/use-site-settings";

export function SiteFooter() {
  const settings = useSiteSettings();

  return (
    <footer className="mt-stack-lg w-full glass-bar border-t">
      <div className="mx-auto grid max-w-container-max grid-cols-1 gap-gutter px-gutter py-stack-lg md:grid-cols-3">
        <div>
          <img src="/xsha-logo.png" alt="X-SHA" className="mb-4 h-10 w-auto" />
          <p className="mb-4 text-body-md text-on-surface-variant">{settings.footerTagline}</p>
          <div className="flex gap-4">
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

        <div>
          <h4 className="mb-4 text-label-md font-semibold text-primary">Navigasi</h4>
          <ul className="flex flex-col gap-2">
            <li>
              <Link
                className="text-body-md text-on-surface-variant transition-colors hover:text-secondary"
                to="/katalog"
              >
                Katalog Produk
              </Link>
            </li>
            <li>
              <Link
                className="text-body-md text-on-surface-variant transition-colors hover:text-secondary"
                to="/promo"
              >
                Promo Terbaru
              </Link>
            </li>
            <li>
              <Link
                className="text-body-md text-on-surface-variant transition-colors hover:text-secondary"
                to="/blog"
              >
                Blog
              </Link>
            </li>
            <li>
              <Link
                className="text-body-md text-on-surface-variant transition-colors hover:text-secondary"
                to="/tentang"
              >
                Tentang Kami
              </Link>
            </li>
            <li>
              <Link
                className="text-body-md text-on-surface-variant transition-colors hover:text-secondary"
                to="/kontak"
              >
                Kontak &amp; Outlet
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-label-md font-semibold text-primary">Kontak Kami</h4>
          <ul className="flex flex-col gap-2 text-body-md text-on-surface-variant">
            <li className="flex items-center gap-2">
              <Icon name="mail" className="text-sm" />
              <a href={`mailto:${settings.contactEmail}`} className="hover:text-secondary">
                {settings.contactEmail}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Icon name="call" className="text-sm" />
              <a href={`tel:+${settings.whatsappNumber}`} className="hover:text-secondary">
                {settings.contactPhoneDisplay}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Icon name="location_on" className="mt-0.5 text-sm" />
              {settings.hqAddress}
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/20 py-6 text-center">
        <p className="text-xs text-on-surface-variant">
          © {new Date().getFullYear()} {settings.copyrightSuffix}
        </p>
      </div>
    </footer>
  );
}

import { Link } from "@tanstack/react-router";
import { Icon } from "./icon";

export function SiteFooter() {
  return (
    <footer className="mt-stack-lg w-full glass-bar border-t">
      <div className="mx-auto grid max-w-container-max grid-cols-1 gap-gutter px-gutter py-stack-lg md:grid-cols-4">
        <div>
          <p className="mb-4 font-display text-headline-lg font-bold text-primary">X-SHA</p>
          <p className="text-body-md text-on-surface-variant">
            Heritage of Tasikmalaya sejak 2006. Menghadirkan produk berkualitas tinggi dengan
            sentuhan kearifan lokal di 16+ outlet kami.
          </p>
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
                to="/tentang"
              >
                Tentang Kami
              </Link>
            </li>
            <li>
              <Link
                className="text-body-md text-on-surface-variant transition-colors hover:text-secondary"
                to="/member"
              >
                Member Area
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-label-md font-semibold text-primary">Kontak</h4>
          <ul className="flex flex-col gap-2 text-body-md text-on-surface-variant">
            <li className="flex items-center gap-2">
              <Icon name="mail" className="text-sm" />
              <a href="mailto:info@x-sha.id" className="hover:text-secondary">
                info@x-sha.id
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Icon name="call" className="text-sm" />
              <a href="tel:+6288299633581" className="hover:text-secondary">
                +62 882-9963-3581
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Icon name="location_on" className="mt-0.5 text-sm" />
              Jl. Garut - Tasikmalaya No.103, Cintaraja, Kec. Singaparna, Tasikmalaya, Jawa Barat
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-label-md font-semibold text-primary">Ikuti Kami</h4>
          <div className="flex gap-4">
            <a
              href="https://www.instagram.com/xsha.id/?hl=id"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ikuti X-SHA di Instagram"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-all hover:bg-primary hover:text-on-primary"
            >
              <Icon name="photo_camera" />
            </a>
            <a
              href="https://www.youtube.com/channel/UCS2M2DshFeW2yWKo5JVuRUw"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ikuti X-SHA di YouTube"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-all hover:bg-primary hover:text-on-primary"
            >
              <Icon name="smart_display" />
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/20 py-6 text-center">
        <p className="text-xs text-on-surface-variant">
          © {new Date().getFullYear()} X-SHA. Heritage of Tasikmalaya. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}

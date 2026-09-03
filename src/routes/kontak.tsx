import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getOutlets } from "@/lib/erpnext/outlets";
import { useSiteSettings } from "@/hooks/use-site-settings";
import type { Outlet } from "@/lib/erpnext/types";

export const Route = createFileRoute("/kontak")({
  head: () => ({
    meta: [
      { title: "Kontak & Outlet | X-SHA" },
      {
        name: "description",
        content: "Hubungi X-SHA atau temukan outlet fisik kami di Tasikmalaya dan sekitarnya.",
      },
    ],
  }),
  component: Kontak,
});

function Kontak() {
  const { data: outlets, isLoading } = useQuery({
    queryKey: ["outlets"],
    queryFn: () => getOutlets(),
    staleTime: 10 * 60_000,
  });
  const settings = useSiteSettings();
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-container-max px-gutter pb-stack-lg">
        <header className="mb-stack-lg">
          <h1 className="font-display text-headline-lg-mobile md:text-display-lg">
            {settings.kontakPageHeading}
          </h1>
          <p className="mt-2 max-w-2xl text-body-lg text-on-surface-variant">
            {settings.kontakPageSubtext}
          </p>
        </header>

        <Reveal>
          <section className="mb-stack-lg grid grid-cols-1 gap-gutter md:grid-cols-3">
            <a
              href={`mailto:${settings.contactEmail}`}
              className="flex items-center gap-4 rounded-2xl glass-panel p-6 transition-colors hover:bg-white/40 hover-lift"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon name="mail" />
              </div>
              <div>
                <p className="font-bold text-on-surface">Email</p>
                <p className="text-sm text-on-surface-variant">{settings.contactEmail}</p>
              </div>
            </a>
            <a
              href={`tel:+${settings.whatsappNumber}`}
              className="flex items-center gap-4 rounded-2xl glass-panel p-6 transition-colors hover:bg-white/40 hover-lift"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon name="call" />
              </div>
              <div>
                <p className="font-bold text-on-surface">Telepon</p>
                <p className="text-sm text-on-surface-variant">{settings.contactPhoneDisplay}</p>
              </div>
            </a>
            <div className="flex items-center gap-4 rounded-2xl glass-panel p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon name="location_on" />
              </div>
              <div>
                <p className="font-bold text-on-surface">Kantor Pusat</p>
                <p className="text-sm text-on-surface-variant">{settings.hqAddress}</p>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section>
            <h2 className="mb-6 text-headline-md">Daftar Outlet</h2>

            {isLoading && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-2xl" />
                ))}
              </div>
            )}

            {!isLoading && (outlets?.length ?? 0) === 0 && (
              <p className="py-12 text-center text-on-surface-variant">
                Data outlet belum tersedia.
              </p>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {outlets?.map((o) => (
                <button
                  key={o.code}
                  type="button"
                  onClick={() => setSelectedOutlet(o)}
                  className="hover-lift flex flex-col overflow-hidden rounded-2xl glass-panel text-left"
                >
                  <div className="relative h-40 shrink-0 overflow-hidden bg-primary/10">
                    {o.image ? (
                      <img
                        src={o.image}
                        alt={o.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary/40">
                        <Icon name="storefront" className="text-[48px]" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-grow flex-col p-6">
                    <p className="font-bold text-on-surface">{o.name}</p>
                    {o.city && <p className="text-sm text-on-surface-variant">{o.city}</p>}
                    {o.description && (
                      <p className="mt-2 line-clamp-3 text-sm text-on-surface-variant">
                        {o.description}
                      </p>
                    )}
                    <a
                      href={`https://wa.me/${o.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 font-semibold text-white transition-transform active:scale-95"
                    >
                      <Icon name="chat" className="text-[18px]" filled />
                      Chat via WhatsApp
                    </a>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </Reveal>
      </div>

      <Dialog
        open={selectedOutlet !== null}
        onOpenChange={(open) => !open && setSelectedOutlet(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto p-0">
          {selectedOutlet && (
            <>
              <div className="relative h-64 shrink-0 overflow-hidden rounded-t-lg bg-primary/10">
                {selectedOutlet.image ? (
                  <img
                    src={selectedOutlet.image}
                    alt={selectedOutlet.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-primary/40">
                    <Icon name="storefront" className="text-[64px]" />
                  </div>
                )}
              </div>
              <div className="space-y-3 p-6 pt-4">
                <DialogTitle className="font-display text-headline-md text-on-surface">
                  {selectedOutlet.name}
                </DialogTitle>
                {selectedOutlet.city && (
                  <p className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                    <Icon name="location_on" className="text-[16px]" />
                    {selectedOutlet.city}
                  </p>
                )}
                {selectedOutlet.description && (
                  <p className="whitespace-pre-line text-body-md text-on-surface-variant">
                    {selectedOutlet.description}
                  </p>
                )}
                <a
                  href={`https://wa.me/${selectedOutlet.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 font-semibold text-white transition-transform active:scale-95"
                >
                  <Icon name="chat" className="text-[18px]" filled />
                  Chat via WhatsApp
                </a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}

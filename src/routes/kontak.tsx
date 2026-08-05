import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { getOutlets } from "@/lib/erpnext/outlets";
import { useSiteSettings } from "@/hooks/use-site-settings";

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
                <div
                  key={o.code}
                  className="hover-lift flex items-start gap-4 rounded-2xl glass-panel p-6"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                    <Icon name="storefront" />
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">{o.name}</p>
                    {o.city && <p className="text-sm text-on-surface-variant">{o.city}</p>}
                    <a
                      href={`https://wa.me/${o.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                    >
                      <Icon name="chat" className="text-[16px]" />+{o.whatsapp}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      </div>
    </SiteLayout>
  );
}

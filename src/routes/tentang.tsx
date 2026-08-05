import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { Icon } from "@/components/icon";
import { AnimatedNumber } from "@/components/animated-number";
import { Reveal } from "@/components/reveal";
import { IMG } from "@/lib/catalog-data";
import { getSiteSettings } from "@/lib/erpnext/site-settings";
import { mockSiteSettings } from "@/lib/erpnext/mock-data";

export const Route = createFileRoute("/tentang")({
  head: () => ({
    meta: [
      { title: "Tentang Kami | X-SHA Heritage of Tasikmalaya" },
      {
        name: "description",
        content:
          "PT. Meta Global Triasha (X-SHA) melayani sejak 2006: 16+ outlet, 65.000+ item, 40.000+ member setia dengan komitmen produk halal.",
      },
      { property: "og:title", content: "Tentang Kami | X-SHA Heritage of Tasikmalaya" },
      {
        property: "og:description",
        content: "Visi, misi, dan perjalanan X-SHA sebagai pemimpin ritel regional Priangan Timur.",
      },
      { property: "og:image", content: IMG.office },
      { name: "twitter:image", content: IMG.office },
    ],
  }),
  component: Tentang,
});

function Tentang() {
  const { data: settingsData } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => getSiteSettings(),
    staleTime: 5 * 60_000,
  });
  const settings = settingsData ?? mockSiteSettings;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-container-max px-gutter pb-stack-lg">
        <header className="mb-stack-lg">
          <div className="grid grid-cols-1 items-center gap-stack-md md:grid-cols-2">
            <div>
              <h1 className="mb-stack-sm font-display text-headline-lg-mobile leading-tight md:text-display-lg">
                {settings.aboutHeroTitle}
              </h1>
              <p className="max-w-2xl text-body-lg text-on-surface-variant">
                {settings.aboutHeroBody}
              </p>
            </div>
            <div className="relative h-64 overflow-hidden rounded-3xl border border-white/30 md:h-96">
              <img
                src={settings.aboutOfficeImage}
                alt="Interior kantor korporat X-SHA yang modern dengan aksen pencahayaan ungu"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
            </div>
          </div>
        </header>

        <Reveal>
          <section className="mb-stack-lg grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
            {settings.aboutHighlights.map((h) => (
              <div
                key={h.title}
                className="group rounded-3xl glass-panel p-stack-md transition-all duration-300 hover:-translate-y-2 hover:shadow-glass-lg"
              >
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
                    h.tone === "primary"
                      ? "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-on-primary"
                      : "bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-on-secondary"
                  }`}
                >
                  <Icon name={h.icon} />
                </div>
                <h2 className="mb-2 text-headline-md">{h.title}</h2>
                <p className="text-sm text-on-surface-variant">{h.description}</p>
              </div>
            ))}
          </section>
        </Reveal>

        <Reveal>
          <section className="mb-stack-lg grid grid-cols-1 items-stretch gap-gutter lg:grid-cols-12">
            <div className="relative flex flex-col justify-center overflow-hidden rounded-[32px] glass-panel p-stack-md lg:col-span-5">
              <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
              <h2 className="mb-stack-sm flex items-center gap-3 text-headline-lg">
                <Icon name="visibility" className="text-4xl text-primary" />
                Visi Kami
              </h2>
              <p className="border-l-4 border-primary pl-6 text-body-lg italic leading-relaxed text-on-surface">
                "{settings.aboutVisiQuote}"
              </p>
            </div>
            <div className="rounded-[32px] glass-panel p-stack-md lg:col-span-7">
              <h2 className="mb-stack-sm flex items-center gap-3 text-headline-lg">
                <Icon name="rocket_launch" className="text-4xl text-secondary" />
                Misi Kami
              </h2>
              <ul className="space-y-4">
                {settings.aboutMisi.map((m, i) => (
                  <li key={m} className="flex items-start gap-4">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/10">
                      <span className="font-bold text-secondary">{i + 1}</span>
                    </div>
                    <p className="text-on-surface">{m}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className="mb-stack-lg rounded-[40px] glass-panel px-gutter py-10">
            <div className="grid grid-cols-1 gap-stack-md text-center md:grid-cols-3">
              <div>
                <div className="mb-1 font-display text-display-lg text-primary">
                  <AnimatedNumber
                    value={settings.statMemberCount}
                    formatter={(n) => `${n.toLocaleString("id-ID")}+`}
                  />
                </div>
                <div className="text-label-md uppercase tracking-wider text-on-surface-variant">
                  {settings.statMemberLabel}
                </div>
              </div>
              <div className="border-y border-primary/10 py-8 md:border-x md:border-y-0 md:py-0">
                <div className="mb-1 font-display text-display-lg text-secondary">
                  <AnimatedNumber
                    value={settings.statProductCount}
                    formatter={(n) => `${n.toLocaleString("id-ID")}+`}
                  />
                </div>
                <div className="text-label-md uppercase tracking-wider text-on-surface-variant">
                  {settings.statProductLabel}
                </div>
              </div>
              <div>
                <div className="mb-1 font-display text-display-lg text-primary">
                  <AnimatedNumber
                    value={settings.statEmployeeCount}
                    formatter={(n) => `${n.toLocaleString("id-ID")}+`}
                  />
                </div>
                <div className="text-label-md uppercase tracking-wider text-on-surface-variant">
                  {settings.statEmployeeLabel}
                </div>
              </div>
            </div>
          </section>
        </Reveal>
      </div>
    </SiteLayout>
  );
}

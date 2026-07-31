import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { Icon } from "@/components/icon";
import { IMG } from "@/lib/catalog-data";

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

const highlights = [
  {
    icon: "storefront",
    tone: "primary",
    title: "16+ Outlet",
    desc: "Tersebar strategis di wilayah Priangan Timur, melayani ribuan pelanggan setiap hari.",
  },
  {
    icon: "verified",
    tone: "secondary",
    title: "Produk Kurasi",
    desc: "Setiap item melalui proses seleksi ketat untuk memastikan kualitas dan kehalalan terbaik.",
  },
  {
    icon: "thumb_up",
    tone: "primary",
    title: "Layanan Prima",
    desc: "Dedikasi tim profesional untuk memberikan pengalaman belanja yang menyenangkan dan tulus.",
  },
  {
    icon: "payments",
    tone: "secondary",
    title: "Promo Rutin",
    desc: "Keuntungan lebih bagi pelanggan setia melalui berbagai program penawaran setiap minggu.",
  },
];

const misi = [
  "Menyediakan produk berkualitas tinggi dengan jaminan kehalalan yang konsisten.",
  "Membangun ekosistem ritel yang inovatif berbasis teknologi dan keramahtamahan.",
  "Mensejahterakan karyawan dan mitra melalui model bisnis yang inklusif.",
  "Memberdayakan ekonomi komunitas lokal melalui kolaborasi UMKM.",
  "Menjalankan operasional bisnis sesuai dengan prinsip-prinsip nilai Islami.",
];

function Tentang() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-container-max px-gutter pb-stack-lg">
        <header className="mb-stack-lg">
          <div className="mb-stack-sm inline-flex items-center rounded-full border border-primary/20 glass-panel px-4 py-1.5">
            <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-primary" />
            <span className="text-label-md text-primary">Tentang X-SHA</span>
          </div>
          <div className="grid grid-cols-1 items-center gap-stack-md md:grid-cols-2">
            <div>
              <h1 className="mb-stack-sm font-display text-headline-lg-mobile leading-tight md:text-display-lg">
                Warisan Kepercayaan dari <span className="gradient-text">Tasikmalaya</span>
              </h1>
              <p className="max-w-2xl text-body-lg text-on-surface-variant">
                PT. Meta Global Triasha, yang lebih dikenal sebagai X-SHA, telah melayani kebutuhan
                masyarakat sejak 2006. Berawal dari visi sederhana di Tasikmalaya, kami kini
                bertransformasi menjadi pemimpin ritel regional yang mengedepankan nilai-nilai
                kehalalan dan pelayanan prima.
              </p>
            </div>
            <div className="relative h-64 overflow-hidden rounded-3xl border border-white/30 md:h-96">
              <img
                src={IMG.office}
                alt="Interior kantor korporat X-SHA yang modern dengan aksen pencahayaan ungu"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
            </div>
          </div>
        </header>

        <section className="mb-stack-lg grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((h) => (
            <div
              key={h.title}
              className="group rounded-3xl glass-panel p-stack-md transition-all duration-300 hover:-translate-y-2"
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
              <p className="text-sm text-on-surface-variant">{h.desc}</p>
            </div>
          ))}
        </section>

        <section className="mb-stack-lg grid grid-cols-1 items-stretch gap-gutter lg:grid-cols-12">
          <div className="relative flex flex-col justify-center overflow-hidden rounded-[32px] glass-panel p-stack-md lg:col-span-5">
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
            <h2 className="mb-stack-sm flex items-center gap-3 text-headline-lg">
              <Icon name="visibility" className="text-4xl text-primary" />
              Visi Kami
            </h2>
            <p className="border-l-4 border-primary pl-6 text-body-lg italic leading-relaxed text-on-surface">
              "Menjadi perusahaan perdagangan multinasional yang terpercaya dengan fokus pada produk
              halal, memberikan nilai tambah berkelanjutan bagi seluruh pemangku kepentingan."
            </p>
          </div>
          <div className="rounded-[32px] glass-panel p-stack-md lg:col-span-7">
            <h2 className="mb-stack-sm flex items-center gap-3 text-headline-lg">
              <Icon name="rocket_launch" className="text-4xl text-secondary" />
              Misi Kami
            </h2>
            <ul className="space-y-4">
              {misi.map((m, i) => (
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

        <section className="mb-stack-lg rounded-[40px] glass-panel px-gutter py-10">
          <div className="grid grid-cols-1 gap-stack-md text-center md:grid-cols-3">
            <div>
              <div className="mb-1 font-display text-display-lg text-primary">40.000+</div>
              <div className="text-label-md uppercase tracking-wider text-on-surface-variant">
                Member Setia
              </div>
            </div>
            <div className="border-y border-primary/10 py-8 md:border-x md:border-y-0 md:py-0">
              <div className="mb-1 font-display text-display-lg text-secondary">65.000+</div>
              <div className="text-label-md uppercase tracking-wider text-on-surface-variant">
                Item Produk
              </div>
            </div>
            <div>
              <div className="mb-1 font-display text-display-lg text-primary">300+</div>
              <div className="text-label-md uppercase tracking-wider text-on-surface-variant">
                Karyawan
              </div>
            </div>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}

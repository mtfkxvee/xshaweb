import { IMG } from "@/lib/catalog-data";
import type { ItemGroup, Order, Outlet, Product, SiteSettings } from "./types";

// Fallback data used only when ERPNEXT_URL/API credentials are not
// configured (local dev, or before the integration is wired up), so the
// site keeps rendering instead of hard-failing.
export const mockProducts: Product[] = [];

// Empty on purpose: no placeholder categories; the real tree comes from ERPNext
// (see getItemGroupChildren in products.ts).
export const mockItemGroups: ItemGroup[] = [];

export const mockOutlets: Outlet[] = [
  {
    code: "XSC",
    name: "X-SHA Cikiray",
    city: "Tasikmalaya",
    territory: null,
    whatsapp: "6288299633581",
    latitude: -7.3274,
    longitude: 108.2207,
    warehouse: "SELLING AREA XSC - X",
    image: IMG.office,
    description: "Outlet flagship X-SHA dengan koleksi fashion dan kebutuhan rumah tangga lengkap.",
  },
  {
    code: "XCW",
    name: "X-SHA Ciawi",
    city: "Ciawi",
    territory: null,
    whatsapp: "6288299633581",
    latitude: -7.3691,
    longitude: 108.2027,
    warehouse: "SELLING AREA XCW - X",
    image: null,
    description: null,
  },
  {
    code: "PSR",
    name: "X-SHA Pasar",
    city: "Tasikmalaya",
    territory: null,
    whatsapp: "6288299633581",
    latitude: -7.3255,
    longitude: 108.2145,
    warehouse: "SELLING AREA PSR - X",
    image: null,
    description: null,
  },
  {
    code: "XPY",
    name: "X-SHA Panyingkiran",
    city: "Tasikmalaya",
    territory: null,
    whatsapp: "6288299633581",
    latitude: -7.3402,
    longitude: 108.2384,
    warehouse: "SELLING AREA XPY - X",
    image: null,
    description: null,
  },
];

export const mockOrders: Order[] = [
  { id: "DEMO-0001", date: "2026-08-14", status: "Selesai", total: 1250000 },
  { id: "DEMO-0002", date: "2026-08-08", status: "Selesai", total: 545000 },
];

// Mirrors the real content seeded into ERPNext's "Site Settings" doctype,
// for local dev without ERPNext credentials configured.
export const mockSiteSettings: SiteSettings = {
  heroHeadline: "Heritage of Tasikmalaya, Modern Living.",
  heroSubtext:
    "Produk kurasi berkualitas dengan jaminan kehalalan, hadir di 16+ outlet dan kini dalam genggaman Anda.",
  heroCtaPrimaryLabel: "Mulai Belanja Sekarang",
  heroCtaPrimaryLink: "/katalog",
  heroCtaSecondaryLabel: "Member Area",
  heroCtaSecondaryLink: "/akun",
  heroSlides: [
    {
      image: IMG.hero,
      alt: "Etalase produk heritage Tasikmalaya di ruang ritel premium bernuansa violet",
    },
    {
      image: IMG.office,
      alt: "Interior kantor korporat X-SHA yang modern dengan aksen pencahayaan ungu",
    },
  ],

  whatsappNumber: "6288299633581",
  contactPhoneDisplay: "+62 882-9963-3581",
  contactEmail: "info@x-sha.id",
  hqAddress: "Jl. Garut - Tasikmalaya No.103, Cintaraja, Kec. Singaparna, Tasikmalaya, Jawa Barat",

  servicesHeading: "Layanan Eksklusif Kami",
  services: [
    { icon: "card_membership", label: "Membership", description: "Poin loyalitas tiap belanja" },
    { icon: "redeem", label: "Promo Rutin", description: "Penawaran baru tiap minggu" },
    { icon: "verified", label: "Produk Kurasi", description: "Seleksi ketat & halal" },
    { icon: "storefront", label: "16+ Outlet", description: "Tersebar di Priangan Timur" },
    { icon: "support_agent", label: "Layanan Ramah", description: "Tim siap membantu Anda" },
    { icon: "chat", label: "Pesan via WhatsApp", description: "Order langsung dari keranjang" },
  ],

  ctaBannerHeading: "Pelayanan Berkualitas di Setiap Kunjungan Anda",
  ctaBannerBody:
    "Dengan 16+ outlet fisik di seluruh wilayah, kami siap melayani Anda dengan standar profesional dan keramahtamahan.",
  ctaBannerButtonLabel: "Temukan Outlet Terdekat",
  ctaBannerButtonLink: "/kontak",

  aboutHeroTitle: "Warisan Kepercayaan dari Tasikmalaya",
  aboutHeroBody:
    "PT. Meta Global Triasha, yang lebih dikenal sebagai X-SHA, telah melayani kebutuhan masyarakat sejak 2006. Berawal dari visi sederhana di Tasikmalaya, kami kini bertransformasi menjadi pemimpin ritel regional yang mengedepankan nilai-nilai kehalalan dan pelayanan prima.",
  aboutOfficeImage: IMG.office,
  aboutHighlights: [
    {
      icon: "storefront",
      tone: "primary",
      title: "16+ Outlet",
      description:
        "Tersebar strategis di wilayah Priangan Timur, melayani ribuan pelanggan setiap hari.",
    },
    {
      icon: "verified",
      tone: "secondary",
      title: "Produk Kurasi",
      description:
        "Setiap item melalui proses seleksi ketat untuk memastikan kualitas dan kehalalan terbaik.",
    },
    {
      icon: "thumb_up",
      tone: "primary",
      title: "Layanan Prima",
      description:
        "Dedikasi tim profesional untuk memberikan pengalaman belanja yang menyenangkan dan tulus.",
    },
    {
      icon: "payments",
      tone: "secondary",
      title: "Promo Rutin",
      description:
        "Keuntungan lebih bagi pelanggan setia melalui berbagai program penawaran setiap minggu.",
    },
  ],
  aboutMisi: [
    "Menyediakan produk berkualitas tinggi dengan jaminan kehalalan yang konsisten.",
    "Membangun ekosistem ritel yang inovatif berbasis teknologi dan keramahtamahan.",
    "Mensejahterakan karyawan dan mitra melalui model bisnis yang inklusif.",
    "Memberdayakan ekonomi komunitas lokal melalui kolaborasi UMKM.",
    "Menjalankan operasional bisnis sesuai dengan prinsip-prinsip nilai Islami.",
  ],
  aboutVisiQuote:
    "Menjadi perusahaan perdagangan multinasional yang terpercaya dengan fokus pada produk halal, memberikan nilai tambah berkelanjutan bagi seluruh pemangku kepentingan.",
  statMemberCount: 40000,
  statMemberLabel: "Member Setia",
  statProductCount: 65000,
  statProductLabel: "Item Produk",
  statEmployeeCount: 300,
  statEmployeeLabel: "Karyawan",

  footerTagline:
    "Heritage of Tasikmalaya sejak 2006. Menghadirkan produk berkualitas tinggi dengan sentuhan kearifan lokal di 16+ outlet kami.",
  instagramUrl: "https://www.instagram.com/xsha.id/?hl=id",
  youtubeUrl: "https://www.youtube.com/channel/UCS2M2DshFeW2yWKo5JVuRUw",
  copyrightSuffix: "X-SHA. Heritage of Tasikmalaya. All Rights Reserved.",

  promoPageHeading: "Penawaran Terbaik Untuk Anda",
  promoPageSubtext:
    "Harga spesial berlaku terbatas di seluruh outlet X-SHA dan pemesanan online via WhatsApp.",
  katalogPageHeading: "Katalog Filter",
  katalogPageSubtext: "Temukan kebutuhan Anda",
  blogPageHeading: "Blog X-SHA",
  blogPageSubtext: "Tips, inspirasi belanja, dan cerita seputar produk kami.",
  kontakPageHeading: "Kontak & Outlet",
  kontakPageSubtext: "Hubungi kami atau kunjungi outlet X-SHA terdekat.",
};

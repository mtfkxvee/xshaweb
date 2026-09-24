export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  alt: string;
  // Present only when an active selling Pricing Rule discounts this item —
  // lets the catalog/search grid show the same promo pricing as the Promo
  // tab instead of the undiscounted standard_rate.
  oldPrice?: number;
  discountPercent?: number;
};

// A node in the Item Group tree (ERPNext models Department > Category >
// Sub Category as three levels of nested Item Group). `isGroup` distinguishes
// a branch (has children, needs "descendants of" when filtering products)
// from a leaf (products attach to it directly via an exact match).
export type ItemGroup = {
  name: string;
  label: string;
  parent: string | null;
  isGroup: boolean;
};

export type Outlet = {
  code: string;
  name: string;
  city: string | null;
  territory: string | null;
  whatsapp: string;
  // Parsed from Outlet.lokasi (a Frappe Geolocation field, stored as a
  // GeoJSON FeatureCollection) — null when the outlet has no pin set yet.
  // Lets the app recommend the nearest outlet to the customer's own GPS
  // position.
  latitude: number | null;
  longitude: number | null;
  // Warehouse this outlet's stock lives in (Outlet.warehouse in ERPNext) —
  // used to filter the catalog to items in stock at this outlet.
  warehouse: string | null;
  image: string | null;
  description: string | null;
};

export type Customer = {
  id: string;
  name: string;
  group: string | null;
  mobile: string | null;
  email: string | null;
  loyaltyProgram: string | null;
  birthDate: string | null;
  // "Kode Pelanggan" — a physical membership card code for in-store
  // customers (format "XSA#####"), or a separate "XAPP#####" series minted
  // for accounts created through the app/website (see google-auth.ts).
  // Used as the member card's scannable/QR-code identifier.
  kodePelanggan: string | null;
};

export type CurrentUser = {
  email: string;
  customer: Customer | null;
};

export type OrderLine = {
  itemCode: string;
  itemName: string;
  qty: number;
  rate: number;
};

export type Order = {
  id: string;
  date: string;
  status: string;
  total: number;
};

// "Pesanan" — an order placed via the app's own checkout, tracked through
// its full lifecycle (unlike Order/Sales Invoice above, which only covers
// the final, completed state — "Riwayat Transaksi"):
//
//   unpaid     Quotation submitted, DOKU hasn't confirmed payment yet
//   preparing  DOKU confirmed payment, converted to a Sales Order — no
//              Delivery Request linked to it yet
//   shipping   A Delivery Request is linked (Quotation.custom_sales_order
//              -> Delivery Request.custom_sales_order), status not yet
//              "Terkirim" (Delivered)
//   completed  That Delivery Request's status is "Terkirim"
//
// `status`/`deliveryStatus` carry the raw underlying ERPNext values for
// display; `stage` is the derived bucket the mobile app groups by.
export type OrderStage = "unpaid" | "preparing" | "shipping" | "completed";

export type Pesanan = {
  id: string;
  date: string;
  status: string;
  total: number;
  stage: OrderStage;
  deliveryStatus: string | null;
};

export type OrderDetailLine = {
  itemCode: string;
  itemName: string;
  qty: number;
  rate: number;
  amount: number;
  uom: string;
};

export type OrderDetail = Order & {
  items: OrderDetailLine[];
};

export type LoyaltyStatus = {
  points: number;
  level: string | null;
  loyaltyProgram: string | null;
};

export type HeroSlide = {
  image: string;
  alt: string;
};

export type ServiceCard = {
  icon: string;
  label: string;
  description: string;
};

export type AboutHighlight = {
  icon: string;
  tone: "primary" | "secondary";
  title: string;
  description: string;
};

// Editable marketing/content copy — backed by the "Site Settings" doctype in
// ERPNext (a Single) so the store's own team can update it without a code
// deploy. See src/lib/erpnext/site-settings.ts.
export type SiteSettings = {
  heroHeadline: string;
  heroSubtext: string;
  heroCtaPrimaryLabel: string;
  heroCtaPrimaryLink: string;
  heroCtaSecondaryLabel: string;
  heroCtaSecondaryLink: string;
  heroSlides: HeroSlide[];

  whatsappNumber: string;
  contactPhoneDisplay: string;
  contactEmail: string;
  hqAddress: string;

  servicesHeading: string;
  services: ServiceCard[];

  ctaBannerHeading: string;
  ctaBannerBody: string;
  ctaBannerButtonLabel: string;
  ctaBannerButtonLink: string;

  aboutHeroTitle: string;
  aboutHeroBody: string;
  aboutOfficeImage: string;
  aboutHighlights: AboutHighlight[];
  aboutMisi: string[];
  aboutVisiQuote: string;
  statMemberCount: number;
  statMemberLabel: string;
  statProductCount: number;
  statProductLabel: string;
  statEmployeeCount: number;
  statEmployeeLabel: string;

  footerTagline: string;
  instagramUrl: string;
  youtubeUrl: string;
  copyrightSuffix: string;

  promoPageHeading: string;
  promoPageSubtext: string;
  katalogPageHeading: string;
  katalogPageSubtext: string;
  blogPageHeading: string;
  blogPageSubtext: string;
  kontakPageHeading: string;
  kontakPageSubtext: string;
};

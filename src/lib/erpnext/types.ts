export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  alt: string;
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
  // Warehouse this outlet's stock lives in (Outlet.warehouse in ERPNext) —
  // used to filter the catalog to items in stock at this outlet.
  warehouse: string | null;
};

export type Customer = {
  id: string;
  name: string;
  group: string | null;
  mobile: string | null;
  email: string | null;
  loyaltyProgram: string | null;
  birthDate: string | null;
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

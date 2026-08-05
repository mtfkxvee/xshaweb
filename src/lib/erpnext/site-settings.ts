import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { erpRequest } from "./client";
import { isErpnextConfigured } from "./config";
import { mockSiteSettings } from "./mock-data";
import type { SiteSettings } from "./types";

// Backed by the "Site Settings" Single doctype in ERPNext, so the store's
// own team can edit hero copy, contact info, About Us content, etc. from the
// ERPNext desk (Site Settings) without a code deploy. See the child
// doctypes: Site Hero Slide, Site Service Card, Site About Highlight,
// Site Misi Item.
type ErpSiteSettings = {
  hero_headline: string;
  hero_subtext: string;
  hero_cta_primary_label: string;
  hero_cta_primary_link: string;
  hero_cta_secondary_label: string;
  hero_cta_secondary_link: string;
  hero_slides: { image: string; alt_text: string }[];

  whatsapp_number: string;
  contact_phone_display: string;
  contact_email: string;
  hq_address: string;

  services_heading: string;
  services: { icon: string; label: string; description: string }[];

  cta_banner_heading: string;
  cta_banner_body: string;
  cta_banner_button_label: string;
  cta_banner_button_link: string;

  about_hero_title: string;
  about_hero_body: string;
  about_office_image: string;
  about_highlights: {
    icon: string;
    tone: "primary" | "secondary";
    title: string;
    description: string;
  }[];
  about_misi: { text: string }[];
  about_visi_quote: string;
  stat_member_count: number;
  stat_member_label: string;
  stat_product_count: number;
  stat_product_label: string;
  stat_employee_count: number;
  stat_employee_label: string;

  footer_tagline: string;
  instagram_url: string;
  youtube_url: string;
  copyright_suffix: string;

  promo_page_heading: string;
  promo_page_subtext: string;
  katalog_page_heading: string;
  katalog_page_subtext: string;
  blog_page_heading: string;
  blog_page_subtext: string;
  kontak_page_heading: string;
  kontak_page_subtext: string;
};

export const getSiteSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteSettings> => {
    // Short cache, not no-store: this is low-traffic marketing copy, not
    // per-user data, so a brief window is fine — edits in ERPNext show up
    // within a minute instead of hammering ERPNext on every render.
    setResponseHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=60");

    if (!isErpnextConfigured()) return mockSiteSettings;

    const res = await erpRequest<{ data: ErpSiteSettings }>(
      "/api/resource/Site Settings/Site Settings",
      {},
    );
    const d = res.data;

    return {
      heroHeadline: d.hero_headline,
      heroSubtext: d.hero_subtext,
      heroCtaPrimaryLabel: d.hero_cta_primary_label,
      heroCtaPrimaryLink: d.hero_cta_primary_link,
      heroCtaSecondaryLabel: d.hero_cta_secondary_label,
      heroCtaSecondaryLink: d.hero_cta_secondary_link,
      heroSlides: (d.hero_slides ?? []).map((s) => ({ image: s.image, alt: s.alt_text })),

      whatsappNumber: d.whatsapp_number,
      contactPhoneDisplay: d.contact_phone_display,
      contactEmail: d.contact_email,
      hqAddress: d.hq_address,

      servicesHeading: d.services_heading,
      services: (d.services ?? []).map((s) => ({
        icon: s.icon,
        label: s.label,
        description: s.description,
      })),

      ctaBannerHeading: d.cta_banner_heading,
      ctaBannerBody: d.cta_banner_body,
      ctaBannerButtonLabel: d.cta_banner_button_label,
      ctaBannerButtonLink: d.cta_banner_button_link,

      aboutHeroTitle: d.about_hero_title,
      aboutHeroBody: d.about_hero_body,
      aboutOfficeImage: d.about_office_image,
      aboutHighlights: (d.about_highlights ?? []).map((h) => ({
        icon: h.icon,
        tone: h.tone,
        title: h.title,
        description: h.description,
      })),
      aboutMisi: (d.about_misi ?? []).map((m) => m.text),
      aboutVisiQuote: d.about_visi_quote,
      statMemberCount: d.stat_member_count,
      statMemberLabel: d.stat_member_label,
      statProductCount: d.stat_product_count,
      statProductLabel: d.stat_product_label,
      statEmployeeCount: d.stat_employee_count,
      statEmployeeLabel: d.stat_employee_label,

      footerTagline: d.footer_tagline,
      instagramUrl: d.instagram_url,
      youtubeUrl: d.youtube_url,
      copyrightSuffix: d.copyright_suffix,

      promoPageHeading: d.promo_page_heading,
      promoPageSubtext: d.promo_page_subtext,
      katalogPageHeading: d.katalog_page_heading,
      katalogPageSubtext: d.katalog_page_subtext,
      blogPageHeading: d.blog_page_heading,
      blogPageSubtext: d.blog_page_subtext,
      kontakPageHeading: d.kontak_page_heading,
      kontakPageSubtext: d.kontak_page_subtext,
    };
  },
);

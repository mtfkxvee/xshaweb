import type { ReactNode } from "react";
import { TopNav } from "./top-nav";
import { SiteFooter } from "./site-footer";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { FloatingWhatsappButton } from "./floating-whatsapp-button";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="pointer-events-none fixed -left-24 top-10 -z-10 h-96 w-96 rounded-full bg-primary/10 blur-[80px]" />
      <div className="pointer-events-none fixed -right-24 bottom-0 -z-10 h-[500px] w-[500px] rounded-full bg-secondary/10 blur-[100px]" />
      <TopNav />
      <main className="flex-grow pb-24 pt-32 md:pb-0 md:pt-36">{children}</main>
      <SiteFooter />
      <MobileBottomNav />
      <FloatingWhatsappButton />
    </div>
  );
}

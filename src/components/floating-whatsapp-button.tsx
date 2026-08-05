import { useQuery } from "@tanstack/react-query";
import { Icon } from "./icon";
import { getSiteSettings } from "@/lib/erpnext/site-settings";
import { mockSiteSettings } from "@/lib/erpnext/mock-data";

export function FloatingWhatsappButton() {
  const { data: settingsData } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => getSiteSettings(),
    staleTime: 5 * 60_000,
  });
  const whatsappNumber = (settingsData ?? mockSiteSettings).whatsappNumber;

  return (
    <a
      href={`https://wa.me/${whatsappNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat via WhatsApp"
      className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6"
    >
      <Icon name="chat" className="text-[26px]" filled />
    </a>
  );
}

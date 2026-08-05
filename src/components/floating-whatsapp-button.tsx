import { Icon } from "./icon";
import { useSiteSettings } from "@/hooks/use-site-settings";

export function FloatingWhatsappButton() {
  const { whatsappNumber } = useSiteSettings();

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

import { MessageCircle } from "lucide-react";
import { getWhatsAppUrl, siteConfig } from "@/lib/site-config";

export function WhatsAppFloat() {
  const href = getWhatsAppUrl("Hello! I’d like to know more about The Vantillu Co. products.");
  if (!href) return null;

  return (
    <a className="whatsapp-float" href={href} rel="noreferrer" target="_blank" aria-label="Chat with The Vantillu Co. on WhatsApp">
      <MessageCircle size={21} aria-hidden="true" />
      <span>Chat with us</span>
      <span className="sr-only"> on WhatsApp at {siteConfig.whatsappDisplay}</span>
    </a>
  );
}

export const siteConfig = {
  name: "The Vantillu Co.",
  tagline: "The Modern Millennial Kitchen.",
  positioning: "Traditional homemade goodness presented with a modern, clean and premium identity.",
  registeredBusinessName: "Inti Ruchulu",
  description:
    "The Modern Millennial Kitchen — traditional homemade chocolates, podis, healthy sweets and cookies, made fresh in small batches in Hyderabad.",
  announcement: "Traditional homemade goodness · Made fresh in small batches in Hyderabad · Order online or on WhatsApp",
  craftedBy: "Sriya",
  location: "Hyderabad, India",
  email: "",
  phone: "+91 9441343257",
  instagramHandle: "@the_vantillu_co.",
  instagramUrl: "https://www.instagram.com/the_vantillu_co/",
  whatsappDisplay: "+91 9441343257",
  whatsappNumber: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || "919441343257"),
  shippingFeeInr: null as number | null,
  fssaiRegistration: "23626449000471",
  fssaiIssuingAuthority: "Cyberabad Municipal Corporation",
  fssaiValidThrough: "05 September 2029",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "https://example.com",
};

export function getWhatsAppUrl(message: string): string | null {
  if (!siteConfig.whatsappNumber) return null;
  if (!/^\d{8,15}$/.test(siteConfig.whatsappNumber)) {
    throw new Error("NEXT_PUBLIC_WHATSAPP_NUMBER must contain 8–15 digits in international format.");
  }
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

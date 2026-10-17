export const siteConfig = {
  name: "The Vantillu Co.",
  registeredBusinessName: "Inti Ruchulu",
  description:
    "Homemade spice blends and little indulgences inspired by the flavours, traditions, and warmth of an Indian home kitchen.",
  announcement: "A little warmth from our kitchen, coming your way.",
  email: "",
  phone: "",
  instagramUrl: "",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() ?? "",
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

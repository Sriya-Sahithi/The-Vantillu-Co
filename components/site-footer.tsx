import Link from "next/link";
import { ArrowUpRight, Instagram, MapPin, MessageCircle } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { getWhatsAppUrl, siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  const whatsappUrl = getWhatsAppUrl("Hello! I’d like to enquire about The Vantillu Co. products.");
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Link className="wordmark footer-wordmark" href="/">
            <BrandMark />
          </Link>
          <p>{siteConfig.tagline} Traditional homemade goodness presented with a modern, clean and premium identity.</p>
          <p className="footer-thanks">Thank you for supporting small and homemade businesses.</p>
        </div>
        <div>
          <h2>Explore</h2>
          <Link href="/shop">Shop collection</Link>
          <Link href="/story">Our story</Link>
          <Link href="/contact">Contact & orders</Link>
          <Link href="/track">Track your order</Link>
          <Link href="/account">My account</Link>
        </div>
        <div>
          <h2>Good to know</h2>
          <Link href="/policies/shipping">Shipping & delivery</Link>
          <Link href="/policies/returns">Returns & cancellations</Link>
          <Link href="/policies/privacy">Privacy policy</Link>
          <Link href="/policies/terms">Terms of service</Link>
        </div>
        <div>
          <h2>Contact & Orders</h2>
          <p className="footer-contact-item">
            <MapPin size={14} className="footer-icon" /> {siteConfig.location}
          </p>
          {whatsappUrl ? (
            <a className="footer-contact-link" href={whatsappUrl} rel="noreferrer" target="_blank">
              <MessageCircle size={14} className="footer-icon" /> WhatsApp {siteConfig.whatsappDisplay} <ArrowUpRight size={12} />
            </a>
          ) : null}
          <a className="footer-contact-link" href={siteConfig.instagramUrl} rel="noreferrer" target="_blank">
            <Instagram size={14} className="footer-icon" /> Instagram {siteConfig.instagramHandle} <ArrowUpRight size={12} />
          </a>
        </div>
        <div className="footer-registration">
          <h2>Registered Food Business</h2>
          <p>{siteConfig.registeredBusinessName}</p>
          <p>FSSAI Reg. No. {siteConfig.fssaiRegistration}</p>
          <p className="footer-small">Made fresh in small batches in Hyderabad.</p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} The Vantillu Co. · All rights reserved.</span>
        <span>The Modern Millennial Kitchen · Hyderabad, India</span>
      </div>
    </footer>
  );
}

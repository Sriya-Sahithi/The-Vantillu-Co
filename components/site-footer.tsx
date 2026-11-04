import Link from "next/link";
import { ArrowUpRight, Instagram } from "lucide-react";
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
          <p>{siteConfig.tagline} Traditional homemade goodness, made fresh in small batches.</p>
          <a className="footer-social" href={siteConfig.instagramUrl} rel="noreferrer" target="_blank">
            <Instagram size={17} /> {siteConfig.instagramHandle} <ArrowUpRight size={14} />
          </a>
          <p className="footer-thanks">Thank you for supporting small and homemade.</p>
        </div>
        <div>
          <h2>Explore</h2>
          <Link href="/shop">Shop all</Link>
          <Link href="/story">Our story</Link>
          <Link href="/contact">Get in touch</Link>
        </div>
        <div>
          <h2>Good to know</h2>
          <Link href="/policies/shipping">Shipping & delivery</Link>
          <Link href="/policies/returns">Returns & cancellations</Link>
          <Link href="/policies/privacy">Privacy</Link>
          <Link href="/policies/terms">Terms</Link>
        </div>
        <div>
          <h2>Say hello</h2>
          <p className="footer-contact">{siteConfig.location}</p>
          {whatsappUrl ? (
            <a href={whatsappUrl} rel="noreferrer" target="_blank">
              WhatsApp {siteConfig.whatsappDisplay}
            </a>
          ) : null}
          <a href={siteConfig.instagramUrl} rel="noreferrer" target="_blank">
            Instagram {siteConfig.instagramHandle}
          </a>
        </div>
        <div className="footer-registration">
          <h2>Registered food business</h2>
          <p>{siteConfig.registeredBusinessName}</p>
          <p>FSSAI Registration No. {siteConfig.fssaiRegistration}</p>
          <p className="footer-small">Details shown for owner verification before launch. Please confirm business activity and product labelling requirements.</p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} The Vantillu Co.</span>
        <span>Traditional roots, modern soul.</span>
      </div>
    </footer>
  );
}

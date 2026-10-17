import Link from "next/link";
import { ArrowUpRight, Instagram } from "lucide-react";
import { getWhatsAppUrl, siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  const whatsappUrl = getWhatsAppUrl("Hello! I’d like to enquire about The Vantillu Co. products.");
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Link className="wordmark footer-wordmark" href="/">
            <span className="wordmark-mark" aria-hidden="true">వ</span>
            <span>The Vantillu <i>Co.</i></span>
          </Link>
          <p>From an Indian home kitchen, with warmth in every little detail.</p>
          <a className="footer-social" href={siteConfig.instagramUrl || "/contact"} rel="noreferrer" target={siteConfig.instagramUrl ? "_blank" : undefined}>
            <Instagram size={17} /> Instagram <ArrowUpRight size={14} />
            {!siteConfig.instagramUrl && <span className="sr-only"> (link to be added)</span>}
          </a>
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
          {siteConfig.email ? <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a> : <Link href="/contact">Business email to be added</Link>}
          {siteConfig.phone ? <a href={`tel:${siteConfig.phone}`}>{siteConfig.phone}</a> : <Link href="/contact">Business phone to be added</Link>}
          <a href={whatsappUrl ?? "/contact"} rel={whatsappUrl ? "noreferrer" : undefined} target={whatsappUrl ? "_blank" : undefined}>
            WhatsApp ordering{!whatsappUrl && <span className="sr-only"> (number to be configured)</span>}
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
        <span>Made with care, from our vantillu to yours.</span>
      </div>
    </footer>
  );
}

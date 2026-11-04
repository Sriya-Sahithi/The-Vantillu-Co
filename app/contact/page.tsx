import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, MapPin, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { getWhatsAppUrl, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact & ordering",
  description: "Order homemade chocolates, podis, sweets and cookies from The Vantillu Co. on WhatsApp. Hyderabad.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const whatsappUrl = getWhatsAppUrl("Hello! I have a question for The Vantillu Co.");
  return (
    <div className="page-shell contact-page">
      <section className="page-intro contact-intro">
        <span className="eyebrow">We’re right here</span>
        <h1>Let’s have a <em>little chat.</em></h1>
        <p>Orders are placed on WhatsApp. Tell us what you’d like from the collection and we’ll confirm availability, pack sizes and delivery in Hyderabad.</p>
      </section>
      <div className="contact-layout">
        <div className="contact-form-wrap">
          <span className="eyebrow">Write us a note</span>
          <h2>What’s on <em>your mind?</em></h2>
          <ContactForm />
        </div>
        <aside className="contact-aside">
          <span className="eyebrow">A few other ways</span>
          <h2>Find us <em>here.</em></h2>
          <div className="contact-method">
            <MapPin size={19} />
            <div><strong>Kitchen</strong><span>{siteConfig.location}</span></div>
          </div>
          <div className="contact-method">
            <MessageCircle size={19} />
            <div>
              <strong>WhatsApp</strong>
              {whatsappUrl ? (
                <a href={whatsappUrl} rel="noreferrer" target="_blank">
                  {siteConfig.whatsappDisplay} <ArrowUpRight size={13} />
                </a>
              ) : (
                <span>Business number to be configured</span>
              )}
            </div>
          </div>
          <div className="contact-method">
            <span className="social-glyph" aria-hidden="true">@</span>
            <div>
              <strong>Instagram</strong>
              <a href={siteConfig.instagramUrl} rel="noreferrer" target="_blank">
                {siteConfig.instagramHandle} <ArrowUpRight size={13} />
              </a>
            </div>
          </div>
          <div className="contact-note">
            <span className="eyebrow">How to order</span>
            <p>Browse the collection, add what you like to your enquiry basket, then send it on WhatsApp. We’ll confirm the details with you. No payment is taken on this website.</p>
            <Link className="text-link" href="/shop">Browse the collection <ArrowUpRight size={15} /></Link>
          </div>
          <div className="contact-faq">
            <span className="eyebrow">A few questions</span>
            <details>
              <summary>How do I place an order?</summary>
              <p>Add products to your enquiry basket and send the summary on WhatsApp at {siteConfig.whatsappDisplay}. We’ll confirm availability, pack sizes and pricing with you.</p>
            </details>
            <details>
              <summary>Where do you deliver?</summary>
              <p>We are based in Hyderabad. Delivery coverage and timings are confirmed when you enquire.</p>
            </details>
            <details>
              <summary>Do you have a menu of prices?</summary>
              <p>Pack sizes and prices are shared on WhatsApp so they stay accurate. We do not list unverified prices on the website.</p>
            </details>
            <details>
              <summary>What about payment?</summary>
              <p>No payment is processed on this website. Payment options are confirmed with your order on WhatsApp.</p>
            </details>
          </div>
        </aside>
      </div>
    </div>
  );
}

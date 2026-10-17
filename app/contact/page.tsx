import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Mail, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { getWhatsAppUrl, siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact & ordering",
  description: "Get in touch with The Vantillu Co. about homemade spice blends, treats and order enquiries.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const whatsappUrl = getWhatsAppUrl("Hello! I have a question for The Vantillu Co.");
  return (
    <div className="page-shell contact-page">
      <section className="page-intro contact-intro">
        <span className="eyebrow">We’re right here</span>
        <h1>Let’s have a <em>little chat.</em></h1>
        <p>Questions about the collection, an order enquiry, or just want to say hello? We’d love to hear from you.</p>
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
            <Mail size={19} />
            <div><strong>Email</strong>{siteConfig.email ? <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a> : <span>Business email to be added</span>}</div>
          </div>
          <div className="contact-method">
            <MessageCircle size={19} />
            <div><strong>WhatsApp</strong>{whatsappUrl ? <a href={whatsappUrl} rel="noreferrer" target="_blank">Start a conversation <ArrowUpRight size={13} /></a> : <span>Business number to be configured</span>}</div>
          </div>
          <div className="contact-method">
            <span className="social-glyph" aria-hidden="true">@</span>
            <div><strong>Instagram</strong>{siteConfig.instagramUrl ? <a href={siteConfig.instagramUrl} rel="noreferrer" target="_blank">Follow along <ArrowUpRight size={13} /></a> : <span>Instagram link to be added</span>}</div>
          </div>
          <div className="contact-note"><span className="eyebrow">Before you order</span><p>Delivery areas, timings and payment options are being confirmed. We’ll share the details when you enquire.</p><Link className="text-link" href="/shop">Browse the collection <ArrowUpRight size={15} /></Link></div>
          <div className="contact-faq">
            <span className="eyebrow">A few questions</span>
            <details><summary>How do I place an order?</summary><p>Add products to your enquiry basket and send the summary by WhatsApp when the business number is configured. The team will confirm the details with you.</p></details>
            <details><summary>Where do you deliver?</summary><p>Delivery coverage and timings have not yet been confirmed. Please enquire before placing an order.</p></details>
            <details><summary>How are products packaged?</summary><p>Packaging details will be provided by the business owner before launch.</p></details>
            <details><summary>What about payment and storage?</summary><p>Payment options, ingredients and storage instructions will be confirmed for each product. No payment is processed on this website.</p></details>
          </div>
        </aside>
      </div>
    </div>
  );
}

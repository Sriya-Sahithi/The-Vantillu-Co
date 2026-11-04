import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Our story",
  description: "The Vantillu Co. — The Modern Millennial Kitchen. Traditional homemade goodness, crafted by Sriya in Hyderabad.",
  alternates: { canonical: "/story" },
};

export default function StoryPage() {
  return (
    <div className="story-page">
      <section className="story-hero">
        <div className="story-hero-copy">
          <span className="eyebrow">{siteConfig.tagline}</span>
          <h1>Traditional roots,<br /><em>modern soul.</em></h1>
          <p className="story-draft-label">Crafted by {siteConfig.craftedBy} · Est. 2026 · {siteConfig.location}</p>
        </div>
        <div className="story-hero-image">
          <Image alt="The Vantillu Co. kitchen seal" fill priority sizes="(max-width: 760px) 100vw, 50vw" src="/brand/kitchen-seal.jpg" />
        </div>
      </section>
      <section className="story-body">
        <span className="eyebrow">A little about us</span>
        <h2>From our <em>vantillu</em><br />to yours.</h2>
        <div className="story-prose">
          <p>The Vantillu Co. is a homemade food kitchen in Hyderabad. We make chocolates, traditional podis, healthy sweets and cookies in small batches — familiar flavours, presented with a modern, premium touch.</p>
          <p>Crafted by {siteConfig.craftedBy}, the brand is built on the warmth of a home kitchen and the clarity of a modern millennial table. If you’d like the longer family story on this page, tell us what you’d like shared and we’ll write it in your voice.</p>
          <Link className="text-link" href="/contact">Order on WhatsApp <ArrowRight size={16} /></Link>
        </div>
      </section>
      <section className="story-values">
        <div><span className="eyebrow">Our point of view</span><h2>Rooted in tradition.<br /><em>Made for today.</em></h2></div>
        <p>Homemade. Natural ingredients. No preservatives. Made with love. Product-specific details are confirmed when you enquire — we don’t invent what we haven’t verified yet.</p>
      </section>
    </div>
  );
}

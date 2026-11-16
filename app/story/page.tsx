import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, Leaf, ShieldCheck, Sparkles } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Our Story — The Vantillu Co.",
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
          <p className="story-draft-label">Crafted by {siteConfig.craftedBy} · Handcrafted in Hyderabad, India</p>
        </div>
        <div className="story-hero-image">
          <Image alt="The Vantillu Co. circular brand seal" fill priority sizes="(max-width: 760px) 100vw, 50vw" src="/brand/kitchen-seal.jpg" />
        </div>
      </section>

      <section className="story-body">
        <div>
          <span className="eyebrow">The Origin</span>
          <h2>From our <em>vantillu</em><br />to your table.</h2>
        </div>
        <div className="story-prose">
          <p>
            In Telugu, <em>Vantillu</em> means the kitchen — the heart of every Indian home where aromas of freshly roasted spices, warm sweets, and loving care come together.
          </p>
          <p>
            <strong>The Vantillu Co.</strong> was born from a desire to bring genuine homemade food culture into the lives of modern, fast-paced millennials. We craft homemade chocolates, traditional podis, wholesome sweets, and healthy cookies in small, mindful batches.
          </p>
          <p>
            No industrial shortcuts, no artificial preservatives — just pure, time-honoured flavours presented with clean, elegant, and premium design.
          </p>
          <div className="story-pillars">
            <div className="story-pillar">
              <Leaf size={20} className="pillar-icon" />
              <div>
                <strong>Wholesome Ingredients</strong>
                <span>Pure, natural kitchen ingredients sourced with care.</span>
              </div>
            </div>
            <div className="story-pillar">
              <Sparkles size={20} className="pillar-icon" />
              <div>
                <strong>Small Batch Freshness</strong>
                <span>Made fresh in limited batches so every order tastes like home.</span>
              </div>
            </div>
            <div className="story-pillar">
              <ShieldCheck size={20} className="pillar-icon" />
              <div>
                <strong>Modern & Mindful</strong>
                <span>Clean presentation, honest recipes, and trustworthy quality.</span>
              </div>
            </div>
            <div className="story-pillar">
              <Heart size={20} className="pillar-icon" />
              <div>
                <strong>Direct Warm Service</strong>
                <span>Personal order care and friendly conversation on WhatsApp.</span>
              </div>
            </div>
          </div>
          <Link className="button button-primary" href="/shop">
            Browse our catalogue <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="story-values">
        <div>
          <span className="eyebrow">Our Philosophy</span>
          <h2>Rooted in tradition.<br /><em>Made for today.</em></h2>
        </div>
        <p>
          Traditional homemade goodness presented with a modern, clean and premium identity. Made fresh with love in Hyderabad, India.
        </p>
      </section>
    </div>
  );
}

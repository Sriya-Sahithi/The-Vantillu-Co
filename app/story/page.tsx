import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Our story",
  description: "The idea behind The Vantillu Co., a brand inspired by the warmth and flavours of an Indian home kitchen.",
  alternates: { canonical: "/story" },
};

export default function StoryPage() {
  return (
    <div className="story-page">
      <section className="story-hero">
        <div className="story-hero-copy">
          <span className="eyebrow">The thought behind the name</span>
          <h1>Some of our favourite memories begin <em>in the kitchen.</em></h1>
          <p className="story-draft-label">Draft copy — personalise with the real story before launch</p>
        </div>
        <div className="story-hero-image">
          <Image alt="Ingredients and spices arranged in a home kitchen; reference image" fill priority sizes="(max-width: 760px) 100vw, 50vw" src="https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=1200&q=85" />
          <span className="image-note">Reference image</span>
        </div>
      </section>
      <section className="story-body">
        <span className="eyebrow">A little about us</span>
        <h2>From our <em>vantillu</em><br />to yours.</h2>
        <div className="story-prose">
          <p>Some of our favourite memories begin in the kitchen — with familiar aromas, treasured recipes, and food made with care. The Vantillu Co. brings that feeling to your table through traditional spice blends and homemade treats.</p>
          <p>This is a starting point, not a founder story. Add the real people, place, recipes, and preparation process behind the brand before publishing. We want this page to sound like you, not like a story made up for a website.</p>
          <Link className="text-link" href="/contact">Let’s talk <ArrowRight size={16} /></Link>
        </div>
      </section>
      <section className="story-values">
        <div><span className="eyebrow">Our point of view</span><h2>Rooted in tradition.<br /><em>Made for today.</em></h2></div>
        <p>Familiar flavours, considered presentation, and honest details. Add verified ingredient, sourcing, and preparation information here as the business confirms it.</p>
      </section>
    </div>
  );
}

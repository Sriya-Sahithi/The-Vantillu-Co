import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Sprout } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { TestimonialSection } from "@/components/testimonial-section";
import { categories, products } from "@/lib/products";
import { siteConfig } from "@/lib/site-config";

const featured = [
  products.find((product) => product.slug === "dark-chocolate"),
  products.find((product) => product.slug === "kandi-podi"),
  products.find((product) => product.slug === "mixed-dry-fruit-laddu"),
  products.find((product) => product.slug === "oats-chocolate-chip-cookies"),
].filter((product): product is NonNullable<typeof product> => Boolean(product));

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> {siteConfig.tagline}</span>
          <h1>Traditional roots,<br /><em>modern soul.</em></h1>
          <p>Homemade chocolates, traditional podis, healthy sweets and cookies — made fresh in small batches in Hyderabad.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/shop">Explore our goodness <ArrowRight size={17} /></Link>
            <Link className="text-link" href="/story">Our story <ArrowUpRight size={16} /></Link>
          </div>
          <div className="hero-footnote"><span>01 / 04</span><span className="hero-rule" /><span>Made fresh in small batches</span></div>
        </div>
        <div className="hero-image">
          <Image alt="A colourful home-style meal on a banana leaf, used as mood imagery" fill priority sizes="(max-width: 800px) 100vw, 58vw" src="https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=1600&q=90" />
          <div className="hero-image-tag"><span>Our kind of table</span><small>Reference image · replace with your kitchen</small></div>
          <div className="hero-stamp">
            <Image alt="" fill sizes="108px" src="/brand/kitchen-seal.jpg" />
          </div>
        </div>
        <a className="scroll-cue" href="#categories"><ArrowDown size={15} /> Take a look around</a>
      </section>

      <section className="section categories-section" id="categories">
        <div className="section-heading">
          <div><span className="eyebrow">Four homemade collections</span><h2>Find your <em>favourite.</em></h2></div>
          <Link className="text-link" href="/shop">Shop everything <ArrowUpRight size={16} /></Link>
        </div>
        <div className="category-grid">
          {categories.map((category, index) => (
            <Link className="category-card" href={`/shop?category=${category.id}`} key={category.id}>
              <div className="category-image">
                <Image alt={`${category.name} — reference image`} fill sizes="(max-width: 700px) 45vw, 23vw" src={category.image} />
                <span className="category-index">0{index + 1}</span>
              </div>
              <div className="category-copy"><div><h3>{category.name}</h3><p>{category.description}</p></div><ArrowUpRight size={18} /></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="featured-section">
        <div className="section-heading section-heading-light">
          <div><span className="eyebrow">A few things from our kitchen</span><h2>Little <em>favourites.</em></h2></div>
          <Link className="text-link" href="/shop">Meet the whole collection <ArrowUpRight size={16} /></Link>
        </div>
        <p className="placeholder-note">Pack sizes and prices are shared on WhatsApp when you enquire. Nothing is sold or paid for on this website.</p>
        <div className="product-grid featured-grid">
          {featured.map((product) => <ProductCard key={product.slug} product={product} />)}
        </div>
      </section>

      <section className="promise-section">
        <div className="promise-mark"><Sprout size={29} strokeWidth={1.2} /></div>
        <span className="eyebrow">What matters to us</span>
        <h2>Homemade goodness,<br />made with <em>love.</em></h2>
        <p>The Vantillu Co. is a modern homemade food kitchen — traditional Indian flavours, presented with care.</p>
        <div className="promise-values">
          <span>Homemade</span><span>Natural ingredients</span><span>No preservatives</span><span>Made with love</span>
        </div>
        <p className="placeholder-note promise-disclaimer">These are brand values from our catalogue, not verified product claims. Product-specific details will be added when confirmed.</p>
      </section>

      <section className="kitchen-section">
        <div className="kitchen-image">
          <Image alt="An assortment of spices, herbs and ingredients; reference image" fill sizes="(max-width: 760px) 100vw, 55vw" src="https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=1200&q=85" />
          <span className="image-note">Reference image</span>
        </div>
        <div className="kitchen-copy">
          <span className="eyebrow">A note from our kitchen</span>
          <h2>Crafted by {siteConfig.craftedBy}.<br /><em>Traditional roots, modern soul.</em></h2>
          <p>Every batch is made in Hyderabad with the feeling of a home kitchen — then wrapped with a modern, premium touch.</p>
          <Link className="text-link" href="/story">A little more about us <ArrowRight size={16} /></Link>
          <div className="signature">Crafted by {siteConfig.craftedBy} <span>The Vantillu Co.</span></div>
        </div>
      </section>

      <TestimonialSection />

      <section className="newsletter-strip">
        <span className="eyebrow">Ready to order?</span>
        <h2>Message us on <em>WhatsApp.</em></h2>
        <Link className="button button-outline" href="/contact">Say hello <ArrowRight size={16} /></Link>
      </section>
    </>
  );
}

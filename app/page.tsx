import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Sprout } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { TestimonialSection } from "@/components/testimonial-section";
import { categories, products } from "@/lib/products";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> A little taste of home</span>
          <h1>From our<br /><em>vantillu</em> to yours.</h1>
          <p>Homemade spice blends and little indulgences inspired by the flavours, traditions, and warmth of an Indian home kitchen.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/shop">Explore our goodness <ArrowRight size={17} /></Link>
            <Link className="text-link" href="/story">Our story <ArrowUpRight size={16} /></Link>
          </div>
          <div className="hero-footnote"><span>01 / 04</span><span className="hero-rule" /><span>Made to feel like home</span></div>
        </div>
        <div className="hero-image">
          <Image alt="A colourful home-style meal on a banana leaf, used as mood imagery" fill priority sizes="(max-width: 800px) 100vw, 58vw" src="https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=1600&q=90" />
          <div className="hero-image-tag"><span>Our kind of table</span><small>Reference image · replace with your kitchen</small></div>
          <div className="hero-stamp" aria-hidden="true"><span>made with</span><strong>care</strong><span>every day</span></div>
        </div>
        <a className="scroll-cue" href="#categories"><ArrowDown size={15} /> Take a look around</a>
      </section>

      <section className="section categories-section" id="categories">
        <div className="section-heading">
          <div><span className="eyebrow">A place for every craving</span><h2>Find your <em>favourite.</em></h2></div>
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
        <p className="placeholder-note">Prices and pack sizes shown are development samples only. Please confirm all details before launch.</p>
        <div className="product-grid featured-grid">
          {products.slice(0, 4).map((product) => <ProductCard key={product.slug} product={product} />)}
        </div>
      </section>

      <section className="promise-section">
        <div className="promise-mark"><Sprout size={29} strokeWidth={1.2} /></div>
        <span className="eyebrow">What matters to us</span>
        <h2>Good food begins<br />with <em>good intentions.</em></h2>
        <p>We believe the little things matter: knowing what goes into your food, treating familiar recipes with care, and sharing them with warmth.</p>
        <div className="promise-values">
          <span>Home-prepared</span><span>Traditional flavours</span><span>Clear ingredients</span><span>Thoughtful packaging</span>
        </div>
        <p className="placeholder-note promise-disclaimer">These are brand values, not verified product or preparation claims. Product-specific details will be added when confirmed.</p>
      </section>

      <section className="kitchen-section">
        <div className="kitchen-image">
          <Image alt="An assortment of spices, herbs and ingredients; reference image" fill sizes="(max-width: 760px) 100vw, 55vw" src="https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=1200&q=85" />
          <span className="image-note">Reference image</span>
        </div>
        <div className="kitchen-copy">
          <span className="eyebrow">A note from our kitchen</span>
          <h2>Every kitchen has<br />a story worth <em>sharing.</em></h2>
          <p>This space is saved for the people, recipes, and real moments behind The Vantillu Co. Add your own story and photographs here when you are ready.</p>
          <Link className="text-link" href="/story">A little more about us <ArrowRight size={16} /></Link>
          <div className="signature">The Vantillu Co. <span>Our story, in the making</span></div>
        </div>
      </section>

      <TestimonialSection />

      <section className="newsletter-strip">
        <span className="eyebrow">Something on your mind?</span>
        <h2>We’d love to <em>hear from you.</em></h2>
        <Link className="button button-outline" href="/contact">Say hello <ArrowRight size={16} /></Link>
      </section>
    </>
  );
}

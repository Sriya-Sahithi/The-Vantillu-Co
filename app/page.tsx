import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Sprout } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { TestimonialSection } from "@/components/testimonial-section";
import { listCategories, listProducts } from "@/lib/server/catalog";
import { siteConfig } from "@/lib/site-config";

const FEATURED_SLUGS = ["dark-chocolate", "kandi-podi", "mixed-dry-fruit-laddu", "oats-chocolate-chip-cookies"];

export const revalidate = 30;

export default async function HomePage() {
  const [products, categories] = await Promise.all([listProducts(), listCategories()]);
  const featured = FEATURED_SLUGS.flatMap((slug) => products.find((product) => product.slug === slug) ?? []);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> {siteConfig.tagline}</span>
          <h1>Traditional roots,<br /><em>modern soul.</em></h1>
          <p>Homemade chocolates, traditional podis, healthy sweets and cookies — made in small batches with care.</p>
          <div className="hero-pills">
            <span className="hero-pill">🌱 100% Homemade</span>
            <span className="hero-pill">✨ Small Batch Fresh</span>
            <span className="hero-pill">📍 Hyderabad</span>
          </div>
          <div className="hero-actions">
            <Link className="button button-primary" href="/shop">Explore our collection <ArrowRight size={17} /></Link>
            <Link className="text-link" href="/story">Our brand story <ArrowUpRight size={16} /></Link>
          </div>
          <div className="hero-footnote"><span>14 Products · 4 Collections</span><span className="hero-rule" /><span>Shop online or order on WhatsApp</span></div>
        </div>
        <div className="hero-image-wrap">
          <div className="hero-image-frame">
            <Image
              alt="The Vantillu Co. authentic homemade food collection with artisanal podis, wholesome sweets, and chocolates on a rustic Indian kitchen table"
              className="hero-main-img"
              fill
              priority
              sizes="(max-width: 760px) calc(100vw - 42px), (max-width: 1024px) 50vw, 680px"
              src="/images/hero-rustic-food.webp"
            />
            <div className="hero-stamp">
              <Image alt="The Vantillu Co. circular brand seal" fill sizes="108px" src="/brand/kitchen-seal.webp" />
            </div>
          </div>
        </div>
        <a className="scroll-cue" href="#categories"><ArrowDown size={15} /> Discover our collections</a>
      </section>

      <section className="section categories-section" id="categories">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Four signature homemade collections</span>
            <h2>Find your <em>favourite.</em></h2>
          </div>
          <Link className="text-link" href="/shop">View all products <ArrowUpRight size={16} /></Link>
        </div>
        <div className="category-grid">
          {categories.map((category, index) => (
            <Link className="category-card" href={`/shop?category=${category.id}`} key={category.id}>
              <div className="category-image">
                <Image alt={`${category.name} — handcrafted collection`} fill sizes="(max-width: 700px) 45vw, 23vw" src={category.image} />
                <span className="category-index">0{index + 1}</span>
              </div>
              <div className="category-copy">
                <div>
                  <h3>{category.name}</h3>
                  <p>{category.description}</p>
                </div>
                <ArrowUpRight size={18} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="featured-section">
        <div className="section-heading section-heading-light">
          <div>
            <span className="eyebrow">Handpicked from our kitchen</span>
            <h2>Fresh batch <em>favourites.</em></h2>
          </div>
          <Link className="text-link" href="/shop">Meet the whole catalogue <ArrowUpRight size={16} /></Link>
        </div>
        <p className="placeholder-note">Explore all 14 products. Items marked available can be ordered online; message us on WhatsApp for product questions, custom requests and availability.</p>
        <div className="product-grid featured-grid">
          {featured.map((product) => <ProductCard key={product.slug} product={product} />)}
        </div>
      </section>

      <section className="promise-section">
        <div className="promise-mark"><Sprout size={29} strokeWidth={1.2} /></div>
        <span className="eyebrow">Our brand promise</span>
        <h2>Homemade goodness,<br />made with <em>love.</em></h2>
        <p>The Vantillu Co. celebrates authentic Indian food culture, presenting traditional homemade staples with clean, modern aesthetics.</p>
        <div className="promise-values">
          <span>100% Homemade</span>
          <span>Thoughtful Ingredients</span>
          <span>Small-Batch Preparation</span>
          <span>Small Batch Quality</span>
        </div>
        <p className="promise-disclaimer">Browse the collection and choose the ordering method that works for you.</p>
      </section>

      <section className="kitchen-section">
        <div className="kitchen-image">
          <Image alt="Traditional freshly roasted spices and homemade podis prepared in small batches by The Vantillu Co." fill sizes="(max-width: 760px) 100vw, 55vw" src="/images/podis.webp" />
        </div>
        <div className="kitchen-copy">
          <span className="eyebrow">Behind the brand</span>
          <h2>Crafted by {siteConfig.craftedBy}.<br /><em>Traditional roots, modern soul.</em></h2>
          <p>Every recipe begins with the warmth of a traditional Indian kitchen (<em>Vantillu</em>) and is packaged with clean, mindful minimalism for the modern millennial home.</p>
          <Link className="text-link" href="/story">Read our full story <ArrowRight size={16} /></Link>
          <div className="signature">Crafted by {siteConfig.craftedBy} <span>The Vantillu Co. · Hyderabad</span></div>
        </div>
      </section>

      <TestimonialSection />

      <section className="newsletter-strip">
        <span className="eyebrow">Simple, direct ordering</span>
        <h2>Ready for fresh <em>homemade goodness?</em></h2>
        <p className="order-strip-desc">Place an order through our online checkout or message us on WhatsApp for personal assistance.</p>
        <div className="hero-actions"><Link className="button button-primary" href="/shop">Shop the collection <ArrowRight size={16} /></Link><Link className="text-link" href="/contact">WhatsApp us <ArrowUpRight size={16} /></Link></div>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import { ShopCatalogue } from "@/components/shop-catalogue";
import { listCategories, listProducts } from "@/lib/server/catalog";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Shop homemade chocolates, podis, sweets & cookies",
  description: "Browse The Vantillu Co. collection of homemade chocolates, traditional podis, healthy sweets and cookies. Order online or on WhatsApp.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage() {
  const [products, categories] = await Promise.all([listProducts(), listCategories()]);
  return (
    <div className="page-shell">
      <section className="page-intro shop-intro">
        <span className="eyebrow">A little something for your table</span>
        <h1>Made with <em>a little extra love.</em></h1>
        <p>Homemade chocolates, podis, sweets and cookies — made fresh in small batches in Hyderabad.</p>
        <p className="placeholder-note">Browse all 14 products. Items marked available can be ordered online; for products awaiting pricing or fresh-batch confirmation, message us on WhatsApp. Product photographs should be replaced with current kitchen photography before launch.</p>
      </section>
      <section aria-label="Product catalogue" className="shop-content">
        <ShopCatalogue categories={categories} products={products} />
      </section>
    </div>
  );
}

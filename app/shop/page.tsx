import type { Metadata } from "next";
import { ShopCatalogue } from "@/components/shop-catalogue";

export const metadata: Metadata = {
  title: "Shop homemade Andhra podis, spice blends & treats",
  description: "Browse The Vantillu Co. collection of podis, traditional Telugu spice blends, homemade chocolates and cookies.",
  alternates: { canonical: "/shop" },
};

export default function ShopPage() {
  return (
    <div className="page-shell">
      <section className="page-intro shop-intro">
        <span className="eyebrow">A little something for your table</span>
        <h1>Made with <em>a little extra love.</em></h1>
        <p>Explore familiar flavours and small sweet moments, gathered in one place.</p>
        <p className="placeholder-note">Product details, availability, pack sizes and prices are editable samples and must be confirmed before launch.</p>
      </section>
      <section aria-label="Product catalogue" className="shop-content">
        <ShopCatalogue />
      </section>
    </div>
  );
}

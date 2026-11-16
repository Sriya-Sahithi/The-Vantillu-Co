import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { PublicProduct } from "@/lib/catalog-types";
import { formatPaise } from "@/lib/money";

export function ProductCard({ product }: { product: PublicProduct }) {
  const note =
    product.availability === "available" ? product.packLabel
      : product.availability === "out_of_stock" ? "Out of stock"
      : product.availability === "unavailable" ? "Currently unavailable"
      : "Enquire on WhatsApp";

  return (
    <article className="product-card">
      <Link aria-label={`View ${product.name}`} className="product-image-link" href={`/product/${product.slug}`}>
        <div className="product-image-wrap">
          <Image alt={product.imageAlt} className="product-image" fill sizes="(max-width: 640px) 88vw, (max-width: 1024px) 44vw, 25vw" src={product.image} />
        </div>
      </Link>
      <div className="product-card-copy">
        <div>
          <Link className="product-name" href={`/product/${product.slug}`}>{product.name}</Link>
          <p className="product-price">
            {product.pricePaise !== null ? formatPaise(product.pricePaise) : product.categoryName}
            {note ? <span> · {note}</span> : null}
          </p>
        </div>
        <Link aria-label={`View ${product.name}`} className="round-arrow" href={`/product/${product.slug}`}>
          <ArrowUpRight size={18} />
        </Link>
      </div>
    </article>
  );
}

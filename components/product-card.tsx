import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Product } from "@/lib/products";
import { formatPrice, getCategoryName } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  const listedPrice = product.packSizes.find((pack) => typeof pack.price === "number")?.price;

  return (
    <article className="product-card">
      <Link aria-label={`View ${product.name}`} className="product-image-link" href={`/product/${product.slug}`}>
        <div className="product-image-wrap">
          <Image alt={product.imageAlt} className="product-image" fill sizes="(max-width: 640px) 88vw, (max-width: 1024px) 44vw, 25vw" src={product.image} />
          <span className="image-note">Reference image</span>
        </div>
      </Link>
      <div className="product-card-copy">
        <div>
          <Link className="product-name" href={`/product/${product.slug}`}>{product.name}</Link>
          <p className="product-price">
            {listedPrice !== undefined ? formatPrice(listedPrice) : getCategoryName(product.category)}
            <span> · enquire on WhatsApp</span>
          </p>
        </div>
        <Link aria-label={`View ${product.name}`} className="round-arrow" href={`/product/${product.slug}`}>
          <ArrowUpRight size={18} />
        </Link>
      </div>
    </article>
  );
}

"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Minus, Plus } from "lucide-react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductCard } from "@/components/product-card";
import { getWhatsAppUrl } from "@/lib/site-config";
import { formatPrice, products, type Product } from "@/lib/products";

export function ProductDetail({ product }: { product: Product }) {
  const [packId, setPackId] = useState(product.packSizes[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(product.image);
  const selectedPack = useMemo(() => product.packSizes.find((pack) => pack.id === packId), [packId, product.packSizes]);
  const gallery = [{ src: product.image, alt: product.imageAlt }, ...(product.gallery ?? [])];
  const mainImage = gallery.find((image) => image.src === selectedImage) ?? gallery[0];
  const whatsappUrl = getWhatsAppUrl(`Hello! I’d like to enquire about ${product.name}${selectedPack ? ` (${selectedPack.label})` : ""}. Please let me know if it is available.`);
  const relatedProducts = products.filter((item) => item.slug !== product.slug && item.category === product.category).slice(0, 3);

  return (
    <div className="page-shell product-page">
      <Link className="back-link" href="/shop"><ArrowLeft size={16} /> Back to the shop</Link>
      <div className="product-detail-layout">
        <div className="product-detail-gallery">
          <div className="product-detail-image">
            <Image alt={mainImage.alt} fill priority sizes="(max-width: 800px) 100vw, 55vw" src={mainImage.src} />
            <span className="image-note">Reference image · replace with actual product photo</span>
          </div>
          {gallery.length > 1 && (
            <div aria-label="Product image gallery" className="gallery-thumbnails">
              {gallery.map((image, index) => (
                <button
                  aria-label={`Show reference image ${index + 1}`}
                  aria-pressed={selectedImage === image.src}
                  className={selectedImage === image.src ? "gallery-thumbnail selected" : "gallery-thumbnail"}
                  key={image.src}
                  onClick={() => setSelectedImage(image.src)}
                  type="button"
                >
                  <Image alt="" fill sizes="72px" src={image.src} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="product-detail-copy">
          <span className="eyebrow">The Vantillu Co. · product details to be confirmed</span>
          <h1>{product.name}</h1>
          <p className="detail-price">{selectedPack ? formatPrice(selectedPack.price) : "Price to be confirmed"} <span>sample price · INR</span></p>
          <p className="detail-description">{product.description}</p>
          <div className="detail-field">
            <label htmlFor="pack-size">Choose a pack size</label>
            <select id="pack-size" onChange={(event) => setPackId(event.target.value)} value={packId}>
              {product.packSizes.map((pack) => <option key={pack.id} value={pack.id}>{pack.label} · {formatPrice(pack.price)} sample</option>)}
            </select>
          </div>
          <div className="detail-field">
            <label>Quantity</label>
            <div aria-label="Quantity" className="quantity-control">
              <button aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} type="button"><Minus size={15} /></button>
              <span aria-live="polite">{quantity}</span>
              <button aria-label="Increase quantity" onClick={() => setQuantity((value) => value + 1)} type="button"><Plus size={15} /></button>
            </div>
          </div>
          <div className="detail-actions">
            <AddToCartButton disabled={product.availability === "unavailable" || !selectedPack} packId={packId} quantity={quantity} slug={product.slug} />
            {whatsappUrl ? (
              <a className="button button-whatsapp" href={whatsappUrl} rel="noreferrer" target="_blank">Ask on WhatsApp <ArrowUpRight size={16} /></a>
            ) : (
              <p className="config-hint">WhatsApp ordering will appear once a business number is configured.</p>
            )}
          </div>
          <p className="enquiry-note">Your cart is an enquiry only. We’ll confirm availability, final pricing and delivery details with you; no payment is taken here.</p>
          <div className="product-facts">
            <details>
              <summary>Product details</summary>
              <dl className="product-facts-list">
                <dt>Ingredients</dt><dd>{product.ingredients ?? "To be confirmed by the business owner."}</dd>
                <dt>Allergen information</dt><dd>{product.allergens ?? "To be confirmed by the business owner."}</dd>
                <dt>Net quantity</dt><dd>{product.netQuantity ?? "To be confirmed by the business owner."}</dd>
                <dt>Food labelling</dt><dd>{product.labellingInformation ?? "To be reviewed and added before launch."}</dd>
              </dl>
            </details>
            <details>
              <summary>Storage & shelf life</summary>
              <dl className="product-facts-list">
                <dt>Shelf life</dt><dd>{product.shelfLife ?? "To be confirmed by the business owner."}</dd>
                <dt>Storage</dt><dd>{product.storage ?? "To be confirmed by the business owner."}</dd>
              </dl>
            </details>
            <details>
              <summary>Availability & dispatch</summary>
              <dl className="product-facts-list">
                <dt>Availability</dt><dd>{product.availability === "unavailable" ? "Currently unavailable." : product.availability === "available" ? "Available." : "To be confirmed when you enquire."}</dd>
                <dt>Stock</dt><dd>{product.stock === undefined ? "To be confirmed." : product.stock}</dd>
                <dt>Preparation estimate</dt><dd>{product.preparationEstimate ?? "To be confirmed."}</dd>
                <dt>Dispatch estimate</dt><dd>{product.dispatchEstimate ?? "To be confirmed."}</dd>
              </dl>
            </details>
          </div>
        </div>
      </div>
      {relatedProducts.length > 0 && (
        <section className="related-section">
          <div className="section-heading"><div><span className="eyebrow">You might also like</span><h2>More to <em>discover.</em></h2></div></div>
          <div className="product-grid">{relatedProducts.map((item) => <ProductCard key={item.slug} product={item} />)}</div>
        </section>
      )}
    </div>
  );
}

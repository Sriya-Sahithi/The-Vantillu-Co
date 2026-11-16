"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Minus, Plus } from "lucide-react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductCard } from "@/components/product-card";
import { MAX_LINE_QUANTITY, type PublicProduct } from "@/lib/catalog-types";
import { formatPaise } from "@/lib/money";
import { getWhatsAppUrl } from "@/lib/site-config";

export function ProductDetail({ product, related }: { product: PublicProduct; related: PublicProduct[] }) {
  const packs = product.packSizes;
  const buyable = product.availability === "available";
  const availablePacks = packs ? packs.filter((n) => n <= product.stock) : [];
  const [quantity, setQuantity] = useState(packs ? (availablePacks[0] ?? packs[0]) : 1);
  const maxQuantity = buyable ? Math.min(MAX_LINE_QUANTITY, product.stock) : 1;
  const whatsappUrl = getWhatsAppUrl(`Hello! I’d like to ask about ${product.name}${buyable ? `, quantity ${quantity}` : ""}. Please let me know availability and pack sizes.`);
  const statusText =
    product.availability === "available" ? (product.stock <= 5 ? `Only ${product.stock} left` : "In stock")
      : product.availability === "out_of_stock" ? "Out of stock"
      : product.availability === "unavailable" ? "Currently unavailable"
      : "Not yet available to order online";

  return (
    <div className="page-shell product-page">
      <Link className="back-link" href="/shop"><ArrowLeft size={16} /> Back to the shop</Link>
      <div className="product-detail-layout">
        <div className="product-detail-gallery">
          <div className="product-detail-image">
            <Image alt={product.imageAlt} fill priority sizes="(max-width: 800px) 100vw, 55vw" src={product.image} />
          </div>
        </div>
        <div className="product-detail-copy">
          <span className="eyebrow">{product.categoryName}</span>
          <h1>{product.name}</h1>
          <p className="detail-price">
            {product.pricePaise !== null ? formatPaise(product.pricePaise) : "Price on enquiry"}
            {product.packLabel && product.pricePaise !== null ? <span> {packs ? "" : "· "}{product.packLabel}</span> : null}
          </p>
          <p className="detail-stock" role="status">{statusText}</p>
          <p className="detail-description">{product.description}</p>
          {buyable && packs ? (
            <div className="detail-field">
              <span className="field-label" id="pack-label">Choose a pack</span>
              <div aria-labelledby="pack-label" className="pack-options" role="radiogroup">
                {packs.map((n) => {
                  const ok = n <= product.stock;
                  return (
                    <button aria-checked={quantity === n} className={`pack-option${quantity === n ? " selected" : ""}`} disabled={!ok} key={n} onClick={() => setQuantity(n)} role="radio" type="button">
                      <strong>{n} pieces</strong>
                      <span>{formatPaise((product.pricePaise ?? 0) * n)}</span>
                      {!ok ? <small>Not enough stock</small> : null}
                    </button>
                  );
                })}
              </div>
              <p className="pack-total" role="status">{quantity} × {formatPaise(product.pricePaise ?? 0)} = <strong>{formatPaise((product.pricePaise ?? 0) * quantity)}</strong></p>
            </div>
          ) : buyable ? (
            <div className="detail-field">
              <label id="qty-label">Quantity</label>
              <div aria-labelledby="qty-label" className="quantity-control" role="group">
                <button aria-label="Decrease quantity" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} type="button"><Minus size={15} /></button>
                <span aria-live="polite">{quantity}</span>
                <button aria-label="Increase quantity" disabled={quantity >= maxQuantity} onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))} type="button"><Plus size={15} /></button>
              </div>
            </div>
          ) : null}
          <div className="detail-actions">
            {buyable ? (
              <>
                <AddToCartButton disabled={packs ? !availablePacks.includes(quantity) : false} quantity={quantity} replace={Boolean(packs)} slug={product.slug} />
                <AddToCartButton disabled={packs ? !availablePacks.includes(quantity) : false} goToCheckout label="Buy now" quantity={quantity} replace={Boolean(packs)} slug={product.slug} variant="outline" />
              </>
            ) : (
              <button className="button button-primary add-button" disabled type="button">{product.availability === "out_of_stock" ? "Out of stock" : "Not available to order yet"}</button>
            )}
          </div>
          <p className="enquiry-note">
            {buyable ? "Secure online payment by UPI, cards, net banking and wallets. Home delivery only." : "This item can’t be ordered online right now."}
            {whatsappUrl ? <> Questions? <a className="text-link" href={whatsappUrl} rel="noreferrer" target="_blank">Message us on WhatsApp <ArrowUpRight size={12} /></a></> : null}
          </p>
          <div className="product-facts">
            <details>
              <summary>Product details</summary>
              <dl className="product-facts-list">
                <dt>Ingredients</dt><dd>{product.ingredients ?? "To be confirmed when you enquire."}</dd>
                <dt>Allergen information</dt><dd>{product.allergens ?? "To be confirmed when you enquire."}</dd>
                <dt>Net quantity</dt><dd>{product.netQuantity ?? product.packLabel ?? "To be confirmed when you enquire."}</dd>
              </dl>
            </details>
            <details>
              <summary>Storage & shelf life</summary>
              <dl className="product-facts-list">
                <dt>Shelf life</dt><dd>{product.shelfLife ?? "To be confirmed when you enquire."}</dd>
                <dt>Storage</dt><dd>{product.storage ?? "To be confirmed when you enquire."}</dd>
              </dl>
            </details>
            <details>
              <summary>Delivery</summary>
              <dl className="product-facts-list">
                <dt>Made in</dt><dd>Hyderabad, in small batches.</dd>
                <dt>Delivery</dt><dd>Home delivery only. Serviceability and charges are shown at checkout.</dd>
              </dl>
            </details>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="related-section">
          <div className="section-heading"><div><span className="eyebrow">You might also like</span><h2>More to <em>discover.</em></h2></div></div>
          <div className="product-grid">{related.map((item) => <ProductCard key={item.slug} product={item} />)}</div>
        </section>
      )}
    </div>
  );
}

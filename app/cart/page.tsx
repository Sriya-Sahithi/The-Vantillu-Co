"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Minus, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useCart } from "@/components/cart-provider";
import { formatPrice, getProduct } from "@/lib/products";
import { getWhatsAppUrl, siteConfig } from "@/lib/site-config";

export default function CartPage() {
  const { items, hydrated, subtotal, updateQuantity, removeItem } = useCart();
  const hasPricedItems = subtotal > 0;
  const message = useMemo(() => {
    const lines = items.flatMap((item) => {
      const product = getProduct(item.slug);
      const pack = product?.packSizes.find((size) => size.id === item.packId);
      if (!product || !pack) return [];
      const priceNote = pack.price !== undefined ? ` — ${formatPrice(pack.price * item.quantity)}` : "";
      return [`• ${product.name} — ${pack.label} × ${item.quantity}${priceNote}`];
    });
    return [
      "Hello! I’d like to enquire about this order:",
      "",
      ...lines,
      "",
      hasPricedItems ? `Noted subtotal: ${formatPrice(subtotal)} (to be confirmed)` : "Please share pack sizes, availability and prices.",
      "Delivery: Hyderabad — charges to be confirmed",
      "Please confirm product availability, pack sizes, final prices and delivery details. This is an enquiry, not a confirmed order.",
    ].join("\n");
  }, [hasPricedItems, items, subtotal]);
  const whatsappUrl = items.length ? getWhatsAppUrl(message) : null;

  return (
    <div className="page-shell cart-page">
      <div className="cart-heading">
        <span className="eyebrow">A little something for later</span>
        <h1>Your <em>enquiry basket.</em></h1>
        <p>Gather what you’d like. We’ll confirm pack sizes, prices and delivery on WhatsApp. Nothing is paid for here.</p>
      </div>
      {!hydrated ? (
        <div aria-live="polite" className="cart-loading">Loading your saved enquiry…</div>
      ) : items.length === 0 ? (
        <div className="empty-cart">
          <span className="empty-cart-mark" aria-hidden="true">
            <Image alt="" height={72} src="/brand/kitchen-seal.jpg" width={72} />
          </span>
          <h2>Your basket is waiting for a little something.</h2>
          <p>Take a look around and add anything you’d like to enquire about.</p>
          <Link className="button button-primary" href="/shop">Explore the shop <ArrowRight size={16} /></Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {items.map((item) => {
              const product = getProduct(item.slug);
              const pack = product?.packSizes.find((size) => size.id === item.packId);
              if (!product || !pack) return null;
              return (
                <article className="cart-item" key={`${item.slug}-${item.packId}`}>
                  <Link className="cart-item-image" href={`/product/${product.slug}`}>
                    <Image alt={product.imageAlt} fill sizes="120px" src={product.image} />
                  </Link>
                  <div className="cart-item-copy">
                    <Link className="product-name" href={`/product/${product.slug}`}>{product.name}</Link>
                    <p>{pack.label}</p>
                    <span className="cart-unit-price">{pack.price !== undefined ? formatPrice(pack.price) : "Price on enquiry"}</span>
                  </div>
                  <div className="cart-item-controls">
                    <div aria-label={`Quantity for ${product.name}`} className="quantity-control">
                      <button aria-label={`Decrease ${product.name} quantity`} disabled={item.quantity <= 1} onClick={() => updateQuantity(item.slug, item.packId, item.quantity - 1)} type="button"><Minus size={14} /></button>
                      <span>{item.quantity}</span>
                      <button aria-label={`Increase ${product.name} quantity`} onClick={() => updateQuantity(item.slug, item.packId, item.quantity + 1)} type="button"><Plus size={14} /></button>
                    </div>
                    <strong>{pack.price !== undefined ? formatPrice(pack.price * item.quantity) : `× ${item.quantity}`}</strong>
                    <button aria-label={`Remove ${product.name} from enquiry`} className="remove-item" onClick={() => removeItem(item.slug, item.packId)} type="button"><Trash2 size={16} /> Remove</button>
                  </div>
                </article>
              );
            })}
            <Link className="continue-shopping" href="/shop"><ArrowLeft size={15} /> Continue browsing</Link>
          </div>
          <aside className="order-summary">
            <span className="eyebrow">Your summary</span>
            <h2>Just a note, not an order.</h2>
            {hasPricedItems ? (
              <div className="summary-line"><span>Noted subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
            ) : (
              <div className="summary-line"><span>Pricing</span><span>Shared on WhatsApp</span></div>
            )}
            <div className="summary-line"><span>Delivery</span><span>{siteConfig.location}</span></div>
            <p className="placeholder-note">Pack sizes and prices are confirmed when you message us. No payment is collected on this website.</p>
            {whatsappUrl ? (
              <a className="button button-primary summary-button" href={whatsappUrl} rel="noreferrer" target="_blank">Send enquiry on WhatsApp <ArrowRight size={16} /></a>
            ) : (
              <p className="config-hint">WhatsApp ordering is not configured yet. Add the business number to the environment settings.</p>
            )}
            <p className="privacy-note">The message opens WhatsApp with an enquiry summary. No order is accepted and no payment is collected on this website.</p>
          </aside>
        </div>
      )}
    </div>
  );
}

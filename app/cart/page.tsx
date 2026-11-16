"use client";

import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, ArrowLeft, ArrowRight, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { useQuote } from "@/components/use-quote";
import { MAX_LINE_QUANTITY } from "@/lib/catalog-types";
import { formatPaise } from "@/lib/money";

export default function CartPage() {
  const { items, hydrated, setQuantity, removeItem } = useCart();
  const { quote, loading, error, refresh } = useQuote(items, hydrated, null);
  const lineBySlug = new Map(quote?.lines.map((line) => [line.slug, line]));
  const issueBySlug = new Map(quote?.issues.map((issue) => [issue.slug, issue]));
  const canCheckout = Boolean(quote && quote.lines.length > 0 && quote.issues.length === 0);

  return (
    <div className="page-shell cart-page">
      <div className="cart-heading">
        <span className="eyebrow">Your selection</span>
        <h1>Your <em>cart.</em></h1>
        <p>Review your items, then continue to secure checkout. You don’t need an account.</p>
      </div>
      {!hydrated || (loading && !quote && items.length > 0) ? (
        <div aria-live="polite" className="cart-loading" role="status"><span className="spinner" aria-hidden="true" /> Loading your cart…</div>
      ) : items.length === 0 ? (
        <div className="empty-cart">
          <span className="empty-cart-mark" aria-hidden="true">
            <Image alt="" height={72} src="/brand/kitchen-seal.webp" width={72} />
          </span>
          <h2>Your cart is waiting for a little something.</h2>
          <p>Take a look around and add something homemade.</p>
          <Link className="button button-primary" href="/shop">Explore the shop <ArrowRight size={16} /></Link>
        </div>
      ) : error ? (
        <div className="notice notice-error" role="alert">
          <p>{error}</p>
          <button className="button button-outline" onClick={refresh} type="button">Try again</button>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {items.map((item) => {
              const line = lineBySlug.get(item.slug);
              const issue = issueBySlug.get(item.slug);
              const name = line?.name ?? issue?.name ?? item.slug.replace(/-/g, " ");
              return (
                <article className="cart-item" key={item.slug}>
                  <Link className="cart-item-image" href={`/product/${item.slug}`}>
                    {line?.image || issue?.image ? <Image alt="" fill sizes="120px" src={(line?.image ?? issue?.image) as string} /> : null}
                  </Link>
                  <div className="cart-item-copy">
                    <Link className="product-name" href={`/product/${item.slug}`}>{name}</Link>
                    {line && !line.packSizes ? <p>{line.packLabel}</p> : null}
                    {line ? <span className="cart-unit-price">{formatPaise(line.unitPricePaise)} {line.packSizes ? "per piece" : "each"}{line.packSizes ? ` · ${item.quantity} pieces` : ""}</span> : null}
                    {issue ? <p className="cart-issue" role="alert"><AlertTriangle size={13} aria-hidden="true" /> {issue.message}</p> : null}
                  </div>
                  <div className="cart-item-controls">
                    {(line?.packSizes ?? issue?.packSizes) ? (
                      <div className="form-field pack-select">
                        <label htmlFor={`pack-${item.slug}`}>Pack size</label>
                        <select id={`pack-${item.slug}`} onChange={(e) => setQuantity(item.slug, Number(e.target.value))} value={item.quantity}>
                          {!(line?.packSizes ?? issue?.packSizes ?? []).includes(item.quantity) ? <option value={item.quantity}>Choose a pack…</option> : null}
                          {(line?.packSizes ?? issue?.packSizes ?? []).filter((n) => !line || n <= line.stock || n === item.quantity).map((n) => <option key={n} value={n}>{n} pieces</option>)}
                        </select>
                      </div>
                    ) : (
                    <div aria-label={`Quantity for ${name}`} className="quantity-control" role="group">
                      <button aria-label="Decrease quantity" disabled={item.quantity <= 1} onClick={() => setQuantity(item.slug, item.quantity - 1)} type="button"><Minus size={14} /></button>
                      <span>{item.quantity}</span>
                      <button aria-label="Increase quantity" disabled={item.quantity >= Math.min(MAX_LINE_QUANTITY, line?.stock ?? MAX_LINE_QUANTITY)} onClick={() => setQuantity(item.slug, item.quantity + 1)} type="button"><Plus size={14} /></button>
                    </div>
                    )}
                    <strong>{line ? formatPaise(line.lineTotalPaise) : "—"}</strong>
                    <button aria-label={`Remove ${name} from cart`} className="remove-item" onClick={() => removeItem(item.slug)} type="button"><Trash2 size={16} /> Remove</button>
                  </div>
                </article>
              );
            })}
            <Link className="continue-shopping" href="/shop"><ArrowLeft size={15} /> Continue shopping</Link>
          </div>
          <aside aria-busy={loading} className="order-summary">
            <span className="eyebrow">Order summary</span>
            <h2>Almost there.</h2>
            <div className="summary-line"><span>Subtotal</span><strong>{formatPaise(quote?.subtotalPaise ?? 0)}</strong></div>
            <div className="summary-line"><span>Delivery</span><span>Calculated at checkout</span></div>
            {quote && quote.delivery.defaultFeePaise > 0 ? <p className="placeholder-note">Delivery from {formatPaise(quote.delivery.defaultFeePaise)}, confirmed once you enter your PIN code.</p> : null}
            {quote?.delivery.freeThresholdPaise ? <p className="placeholder-note">Free delivery on orders of {formatPaise(quote.delivery.freeThresholdPaise)} or more.</p> : null}
            {canCheckout ? (
              <Link className="button button-primary summary-button" href="/checkout">Proceed to checkout <ArrowRight size={16} /></Link>
            ) : (
              <button className="button button-primary summary-button" disabled type="button">Fix the items above to continue</button>
            )}
            <p className="privacy-note">Prices and availability are confirmed again securely at checkout. Home delivery only.</p>
          </aside>
        </div>
      )}
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Circle, ExternalLink } from "lucide-react";
import { STATUS_LABELS } from "@/lib/order-status";
import { formatPaise } from "@/lib/money";
import type { OrderView } from "@/lib/server/orders";

const dateFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));

export function StatusBadge({ status }: { status: OrderView["status"] }) {
  return <span className={`status-badge status-${status}`}>{STATUS_LABELS[status]}</span>;
}

const PAYMENT_LABEL = { paid: "Paid", pending: "Awaiting payment", failed: "Payment failed", refunded: "Refunded" } as const;

export function OrderTimeline({ steps }: { steps: OrderView["timeline"] }) {
  return (
    <ol aria-label="Order progress" className="timeline">
      {steps.map((step) => (
        <li className={`timeline-step ${step.state}`} key={step.key}>
          <span aria-hidden="true" className="timeline-dot">{step.state === "done" ? <Check size={12} /> : <Circle size={8} />}</span>
          <span className="timeline-label">{step.label}{step.state === "current" ? <span className="sr-only"> (current)</span> : null}</span>
          <span className="timeline-time">{step.at ? formatDate(step.at) : ""}</span>
        </li>
      ))}
    </ol>
  );
}

export function OrderSummaryCard({ order, children }: { order: OrderView; children?: React.ReactNode }) {
  const a = order.address;
  return (
    <div className="order-detail">
      <div className="order-detail-head">
        <div>
          <span className="eyebrow">Order {order.orderNumber}</span>
          <p className="muted">Placed {formatDate(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      {children}
      <section aria-label="Progress" className="checkout-card">
        <h2>Progress</h2>
        <OrderTimeline steps={order.timeline} />
        {order.tracking ? (
          <div className="tracking-box">
            <strong>Courier tracking</strong>
            <p>{[order.tracking.courier, order.tracking.trackingId].filter(Boolean).join(" · ")}</p>
            {order.tracking.url ? <a className="inline-link" href={order.tracking.url} rel="noopener noreferrer" target="_blank">Track shipment <ExternalLink size={12} aria-hidden="true" /></a> : null}
          </div>
        ) : order.status === "dispatched" ? <p className="muted">Tracking details will appear here if the courier provides them.</p> : null}
        {order.refunds.length ? (
          <p className="muted">Refund of {formatPaise(order.refunds[0].amountPaise)}: {order.refunds[0].status === "processed" ? "processed by the payment gateway" : order.refunds[0].status === "failed" ? "could not be processed — we will contact you" : "initiated, usually reaches you in 5–7 working days"}.</p>
        ) : null}
      </section>
      <section aria-label="Items" className="checkout-card">
        <h2>Items</h2>
        <ul className="summary-items">
          {order.items.map((item) => (
            <li key={item.slug}>
              <span className="summary-thumb">{item.image ? <Image alt="" fill sizes="52px" src={item.image} /> : null}</span>
              <span className="summary-name">{item.name}<small>{item.quantity} × {formatPaise(item.unitPricePaise)}{item.packLabel ? ` · ${item.packLabel}` : ""}</small></span>
              <strong>{formatPaise(item.lineTotalPaise)}</strong>
            </li>
          ))}
        </ul>
        <div className="summary-line"><span>Subtotal</span><span>{formatPaise(order.subtotalPaise)}</span></div>
        <div className="summary-line"><span>Delivery</span><span>{order.deliveryFeePaise === 0 ? "Free" : formatPaise(order.deliveryFeePaise)}</span></div>
        <div className="summary-line summary-total"><span>Total</span><strong>{formatPaise(order.totalPaise)}</strong></div>
        <div className="summary-line"><span>Payment</span><span>{PAYMENT_LABEL[order.paymentStatus]}</span></div>
      </section>
      <section aria-label="Delivery address" className="checkout-card">
        <h2>Delivery address</h2>
        <address>
          {order.customer.name}<br />
          {a.house}, {a.street}{a.landmark ? `, ${a.landmark}` : ""}<br />
          {a.city}, {a.district}, {a.state} {a.pincode}<br />
          {order.customer.mobile}
        </address>
      </section>
    </div>
  );
}

export function BackToShop() {
  return <Link className="button button-outline" href="/shop">Continue shopping</Link>;
}

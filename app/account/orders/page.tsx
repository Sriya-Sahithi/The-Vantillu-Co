"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountShell } from "@/components/account-shell";
import { useCart } from "@/components/cart-provider";
import { StatusBadge, formatDate } from "@/components/order-detail";
import { api } from "@/lib/client/api";
import { formatPaise } from "@/lib/money";
import type { OrderView } from "@/lib/server/orders";

type AccountOrder = OrderView & { accessToken: string };

function Orders() {
  const router = useRouter();
  const { addItem } = useCart();
  const [orders, setOrders] = useState<AccountOrder[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { api<{ orders: AccountOrder[] }>("/api/account/orders").then((r) => setOrders(r.orders)).catch(() => setError("Could not load your orders.")); }, []);

  function reorder(order: AccountOrder) {
    for (const item of order.items) addItem(item.slug, item.quantity);
    router.push("/cart"); // the cart re-validates price and stock on the server
  }

  if (error) return <p className="notice notice-error" role="alert">{error}</p>;
  if (!orders) return <div className="cart-loading" role="status"><span className="spinner" aria-hidden="true" /> Loading your orders…</div>;
  if (!orders.length) return <div className="empty-cart"><h2>No orders yet.</h2><p>When you place an order it will appear here.</p><Link className="button button-primary" href="/shop">Explore the shop</Link></div>;

  return (
    <ul className="order-list">
      {orders.map((o) => (
        <li className="checkout-card" key={o.orderNumber}>
          <div className="order-detail-head">
            <div><strong>{o.orderNumber}</strong><p className="muted">{formatDate(o.createdAt)}</p></div>
            <StatusBadge status={o.status} />
          </div>
          <p>{o.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")}</p>
          <p className="muted">Total {formatPaise(o.totalPaise)} · {o.paymentStatus === "paid" ? "Paid" : o.paymentStatus === "refunded" ? "Refunded" : o.paymentStatus === "failed" ? "Payment failed" : "Awaiting payment"} · Deliver to {o.address.city} {o.address.pincode}</p>
          <div className="form-actions">
            <Link className="button button-primary" href={`/account/orders/${o.orderNumber}`}>View details</Link>
            <button className="button button-outline" onClick={() => reorder(o)} type="button">Reorder</button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function OrdersPage() {
  return <AccountShell title={<>My <em>orders.</em></>}>{() => <Orders />}</AccountShell>;
}

"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountShell } from "@/components/account-shell";
import { useCart } from "@/components/cart-provider";
import { OrderSummaryCard } from "@/components/order-detail";
import { ClientApiError, api } from "@/lib/client/api";
import type { OrderView } from "@/lib/server/orders";

function Detail() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const router = useRouter();
  const { addItem } = useCart();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ order: OrderView }>(`/api/orders/${encodeURIComponent(orderNumber)}`).then((r) => setOrder(r.order)).catch((e) => setError(e instanceof ClientApiError && e.status === 404 ? "Order not found in your account." : "Could not load this order."));
  }, [orderNumber]);

  if (error) return <p className="notice notice-error" role="alert">{error} <Link className="inline-link" href="/account/orders">Back to my orders</Link></p>;
  if (!order) return <div className="cart-loading" role="status"><span className="spinner" aria-hidden="true" /> Loading…</div>;
  return (
    <>
      <Link className="back-link" href="/account/orders">← All orders</Link>
      <OrderSummaryCard order={order} />
      <div className="form-actions">
        <button className="button button-primary" onClick={() => { order.items.forEach((i) => addItem(i.slug, i.quantity)); router.push("/cart"); }} type="button">Reorder these items</button>
      </div>
    </>
  );
}

export default function OrderDetailPage() {
  return <AccountShell title={<>Order <em>details.</em></>}>{() => <Detail />}</AccountShell>;
}

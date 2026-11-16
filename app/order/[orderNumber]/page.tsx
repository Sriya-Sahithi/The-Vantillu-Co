"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { BackToShop, OrderSummaryCard } from "@/components/order-detail";
import { ClientApiError, api, rememberOrder } from "@/lib/client/api";
import { openCheckout, type PaymentSession } from "@/lib/client/razorpay";
import type { OrderView } from "@/lib/server/orders";

function OrderPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const token = useSearchParams().get("t");
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [claimed, setClaimed] = useState(false);
  const polls = useRef(0);

  const load = useCallback(async () => {
    try {
      const data = await api<{ order: OrderView }>(`/api/orders/${encodeURIComponent(orderNumber)}${token ? `?t=${encodeURIComponent(token)}` : ""}`);
      setOrder(data.order);
      setError("");
      if (token) rememberOrder(data.order.orderNumber, token);
      return data.order;
    } catch (e) {
      setError(e instanceof ClientApiError && e.status === 404 ? "We could not find this order. Check the link in your confirmation email, or look it up with your mobile number." : e instanceof ClientApiError ? e.message : "Could not load your order.");
      return null;
    }
  }, [orderNumber, token]);

  useEffect(() => { void load(); api<{ user: unknown }>("/api/auth/me").then((m) => setSignedIn(Boolean(m.user))).catch(() => setSignedIn(false)); }, [load]);

  // While payment is unconfirmed (delayed webhook, slow bank), keep checking the verified server state.
  useEffect(() => {
    if (!order || order.status !== "payment_pending" || polls.current >= 12) return;
    const timer = window.setTimeout(() => { polls.current += 1; void load(); }, 5000);
    return () => window.clearTimeout(timer);
  }, [order, load]);

  // A signed-in customer who placed this order as a guest gets it added to their account.
  useEffect(() => {
    if (!order || !token || !signedIn || claimed) return;
    api(`/api/orders/${encodeURIComponent(orderNumber)}/claim`, { body: { token } }).then(() => setClaimed(true)).catch(() => undefined);
  }, [order, token, signedIn, claimed, orderNumber]);

  async function payNow() {
    if (!order || !token) return;
    setBusy(true);
    setMessage("");
    try {
      const { session } = await api<{ session: PaymentSession }>("/api/checkout/retry", { body: { orderNumber, token } });
      const result = await openCheckout(session, { name: order.customer.name, email: order.customer.email ?? undefined, contact: order.customer.mobile }, { onFailedAttempt: setMessage });
      if (result === "dismissed") setMessage("Payment was not completed.");
      await load();
    } catch (e) {
      setMessage(e instanceof ClientApiError ? e.message : "Could not start payment.");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="page-shell order-page"><div className="notice notice-error" role="alert"><p>{error}</p><Link className="button button-outline" href="/track">Find my order</Link></div></div>
    );
  }
  if (!order) return <div className="page-shell order-page"><div className="cart-loading" role="status"><span className="spinner" aria-hidden="true" /> Loading your order…</div></div>;

  const paid = order.paymentStatus === "paid" || order.paymentStatus === "refunded" || ["paid", "confirmed", "preparing", "dispatched", "delivered"].includes(order.status);
  const heading =
    paid && order.status !== "refund_initiated" && order.status !== "refunded"
      ? { icon: <CheckCircle2 size={34} aria-hidden="true" />, tone: "ok", title: "Thank you — payment received", text: `We’ve verified your payment of ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(order.totalPaise / 100)}. We’ll start preparing your order soon.` }
      : order.status === "payment_pending"
        ? { icon: <Clock size={34} aria-hidden="true" />, tone: "wait", title: "Confirming your payment…", text: "We haven’t received confirmation from the bank yet. This page updates automatically — please don’t pay again. If money was debited it is reconciled automatically or refunded." }
        : order.status === "payment_failed"
          ? { icon: <AlertTriangle size={34} aria-hidden="true" />, tone: "bad", title: "Payment didn’t go through", text: "No money has been taken for this order. You can try again while we hold your items." }
          : order.status === "cancelled"
            ? { icon: <AlertTriangle size={34} aria-hidden="true" />, tone: "bad", title: "This order was cancelled", text: "If you were charged, a refund will be processed automatically." }
            : { icon: <Clock size={34} aria-hidden="true" />, tone: "wait", title: order.status === "refunded" ? "Refund processed" : "Refund in progress", text: "See the progress below." };

  return (
    <div className="page-shell order-page">
      <div className={`result-banner ${heading.tone}`} role="status">
        <span className="result-icon">{heading.icon}</span>
        <div><h1>{heading.title}</h1><p>{heading.text}</p></div>
      </div>
      {order.canRetryPayment && token ? (
        <div className="checkout-card retry-card">
          {message ? <p className="notice notice-error" role="alert">{message}</p> : null}
          <button className="button button-primary" disabled={busy} onClick={payNow} type="button">{busy ? <><Loader2 className="spin" size={16} aria-hidden="true" /> Please wait…</> : "Pay now"}</button>
        </div>
      ) : null}
      <OrderSummaryCard order={order}>
        {signedIn === false && token && paid ? (
          <div className="checkout-card account-prompt">
            <h2>Keep track of your orders</h2>
            <p>Create a free account in a few seconds to see this order and reorder anytime. Entirely optional.</p>
            <Link className="button button-primary" href={`/account/login?next=${encodeURIComponent(`/order/${order.orderNumber}?t=${token}`)}${order.customer.email ? `&email=${encodeURIComponent(order.customer.email)}` : ""}`}>Create an account</Link>
          </div>
        ) : null}
        {signedIn && claimed ? <p className="notice" role="status">This order has been added to your account.</p> : null}
      </OrderSummaryCard>
      <p className="muted order-bookmark">Bookmark this page or use the link in your email to return to this order. <Link className="inline-link" href="/track">Find another order</Link></p>
      <BackToShop />
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={null}><OrderPage /></Suspense>;
}

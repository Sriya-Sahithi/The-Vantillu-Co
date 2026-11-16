"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { OrderSummaryCard, formatDate } from "@/components/order-detail";
import { ClientApiError, api } from "@/lib/client/api";
import { formatPaise } from "@/lib/money";
import { STATUS_LABELS, type OrderStatus } from "@/lib/order-status";
import type { OrderView } from "@/lib/server/orders";

type AdminOrder = OrderView & { admin: { id: string; razorpayOrderId: string | null; cancelReason: string | null; payments: { paymentId: string | null; status: string; amountPaise: number; method: string | null; failureReason: string | null }[]; history: { status: string; at: string; actor: string; note: string | null }[] } };

export default function AdminOrderPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [data, setData] = useState<{ order: AdminOrder; allowedTransitions: OrderStatus[] } | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [note, setNote] = useState("");
  const [courier, setCourier] = useState("");
  const [trackingId, setTrackingId] = useState("");
  const [url, setUrl] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ order: AdminOrder; allowedTransitions: OrderStatus[] }>(`/api/admin/orders/${orderNumber}`);
      setData(r);
      setCourier(r.order.tracking?.courier ?? ""); setTrackingId(r.order.tracking?.trackingId ?? ""); setUrl(r.order.tracking?.url ?? "");
    } catch { setError("Could not load this order."); }
  }, [orderNumber]);
  useEffect(() => { void load(); }, [load]);

  async function act(body: Record<string, unknown>, success: string) {
    setBusy(true); setMsg(""); setError("");
    try { await api(`/api/admin/orders/${orderNumber}`, { body }); setMsg(success); setNote(""); await load(); }
    catch (e) { setError(e instanceof ClientApiError ? e.message : "Action failed."); }
    finally { setBusy(false); }
  }

  if (error && !data) return <p className="notice notice-error" role="alert">{error}</p>;
  if (!data) return <div className="cart-loading" role="status"><span className="spinner" aria-hidden="true" /> Loading…</div>;
  const { order, allowedTransitions } = data;
  const paid = order.admin.payments.some((p) => p.status === "captured");
  const canRefund = paid && !["refund_initiated", "refunded"].includes(order.status);
  const refundOpen = order.refunds.some((r) => r.status !== "processed");

  return (
    <>
      <Link className="back-link" href="/admin/orders">← All orders</Link>
      <h1 className="admin-title">Order {order.orderNumber}</h1>
      <div aria-live="polite">
        {msg ? <p className="notice" role="status">{msg}</p> : null}
        {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
      </div>
      <div className="admin-grid">
        <div>
          <OrderSummaryCard order={order} />
          <section className="checkout-card">
            <h2>Payments</h2>
            {order.admin.payments.length === 0 ? <p className="muted">No payment attempts recorded.</p> : (
              <ul className="plain-list">{order.admin.payments.map((p, i) => <li key={p.paymentId ?? i}><strong>{p.status}</strong> · {formatPaise(p.amountPaise)} · {p.method ?? "—"} · <code>{p.paymentId}</code>{p.failureReason ? ` · ${p.failureReason}` : ""}</li>)}</ul>
            )}
            <p className="muted">Gateway order: <code>{order.admin.razorpayOrderId ?? "—"}</code></p>
          </section>
          <section className="checkout-card">
            <h2>Audit trail</h2>
            <ul className="plain-list">{order.admin.history.map((h, i) => <li key={i}>{formatDate(h.at)} — <strong>{STATUS_LABELS[h.status as OrderStatus] ?? h.status}</strong> by {h.actor}{h.note ? ` (${h.note})` : ""}</li>)}</ul>
          </section>
        </div>
        <div>
          <section className="checkout-card">
            <h2>Update status</h2>
            {allowedTransitions.length === 0 ? <p className="muted">No manual status changes are available for this order.</p> : (
              <>
                <div className="form-field"><label htmlFor="st-note">Note (optional, shown in audit trail)</label><input id="st-note" maxLength={300} onChange={(e) => setNote(e.target.value)} value={note} /></div>
                <div className="form-actions">
                  {allowedTransitions.map((s) => (
                    <button className={`button ${s === "cancelled" ? "button-outline" : "button-primary"}`} disabled={busy} key={s} onClick={() => { if (s !== "cancelled" || window.confirm("Cancel this order? Stock will be returned.")) void act({ action: "status", status: s, note }, `Order moved to ${STATUS_LABELS[s]}.`); }} type="button">
                      {s === "confirmed" ? "Confirm order" : s === "cancelled" ? "Cancel order" : `Mark ${STATUS_LABELS[s].toLowerCase()}`}
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
          <form className="checkout-card" onSubmit={(e: FormEvent) => { e.preventDefault(); void act({ action: "tracking", courier, trackingId, url }, "Tracking details saved."); }}>
            <h2>Courier & tracking</h2>
            <p className="muted">Customers see tracking only when you enter it here.</p>
            <div className="form-field"><label htmlFor="tr-c">Courier</label><input id="tr-c" maxLength={80} onChange={(e) => setCourier(e.target.value)} value={courier} /></div>
            <div className="form-field"><label htmlFor="tr-i">Tracking ID</label><input id="tr-i" maxLength={80} onChange={(e) => setTrackingId(e.target.value)} value={trackingId} /></div>
            <div className="form-field"><label htmlFor="tr-u">Tracking link (https://…)</label><input id="tr-u" maxLength={500} onChange={(e) => setUrl(e.target.value)} type="url" value={url} /></div>
            <button className="button button-primary" disabled={busy} type="submit">Save tracking</button>
          </form>
          <section className="checkout-card">
            <h2>Refund</h2>
            {canRefund ? (
              <>
                <div className="form-field"><label htmlFor="rf-r">Reason</label><input id="rf-r" maxLength={300} onChange={(e) => setRefundReason(e.target.value)} value={refundReason} /></div>
                <button className="button button-outline" disabled={busy} onClick={() => { if (window.confirm(`Refund ${formatPaise(order.totalPaise)} to the customer? This cannot be undone.`)) void act({ action: "refund", reason: refundReason }, "Refund initiated."); }} type="button">Refund full amount ({formatPaise(order.totalPaise)})</button>
              </>
            ) : <p className="muted">{paid ? "A refund has already been started." : "Nothing to refund — no verified payment."}</p>}
            {refundOpen ? <button className="button button-outline" disabled={busy} onClick={() => void act({ action: "sync_refund" }, "Refund status refreshed from the gateway.")} type="button">Check refund status with gateway</button> : null}
          </section>
        </div>
      </div>
    </>
  );
}

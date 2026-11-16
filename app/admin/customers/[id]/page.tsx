"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusBadge, formatDate } from "@/components/order-detail";
import { api } from "@/lib/client/api";
import { formatPaise } from "@/lib/money";
import type { OrderStatus } from "@/lib/order-status";

type D = { email: string; name: string; mobile: string | null; joinedAt: string; orders: { orderNumber: string; status: OrderStatus; totalPaise: number; createdAt: string }[]; addresses: { label: string; name: string; line: string; isDefault: boolean }[] };

export default function AdminCustomer() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<D | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { api<{ customer: D }>(`/api/admin/customers/${id}`).then((r) => setD(r.customer)).catch(() => setErr("Could not load this customer.")); }, [id]);
  if (err) return <p className="notice notice-error" role="alert">{err}</p>;
  if (!d) return <div className="cart-loading" role="status"><span className="spinner" aria-hidden="true" /> Loading…</div>;
  return (
    <>
      <Link className="back-link" href="/admin/customers">← All customers</Link>
      <h1 className="admin-title">{d.name || d.email}</h1>
      <p className="muted">{d.email} · {d.mobile ?? "no mobile"} · joined {formatDate(d.joinedAt)}</p>
      <section className="checkout-card"><h2>Orders</h2>
        {d.orders.length === 0 ? <p className="muted">No orders yet.</p> : <ul className="plain-list">{d.orders.map((o) => <li key={o.orderNumber}><Link className="inline-link" href={`/admin/orders/${o.orderNumber}`}>{o.orderNumber}</Link> · {formatDate(o.createdAt)} · {formatPaise(o.totalPaise)} · <StatusBadge status={o.status} /></li>)}</ul>}
      </section>
      <section className="checkout-card"><h2>Saved addresses</h2>
        {d.addresses.length === 0 ? <p className="muted">None.</p> : <ul className="plain-list">{d.addresses.map((a, i) => <li key={i}><strong>{a.label}{a.isDefault ? " (default)" : ""}</strong> — {a.name}, {a.line}</li>)}</ul>}
      </section>
    </>
  );
}

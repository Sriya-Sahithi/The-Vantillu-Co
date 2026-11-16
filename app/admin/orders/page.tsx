"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { StatusBadge, formatDate } from "@/components/order-detail";
import { api } from "@/lib/client/api";
import { formatPaise } from "@/lib/money";
import { ORDER_STATUSES, STATUS_LABELS, type OrderStatus } from "@/lib/order-status";

type Row = { orderNumber: string; status: OrderStatus; customerName: string; mobile: string; totalPaise: number; createdAt: string; city: string; itemCount: number };

function Orders() {
  const [status, setStatus] = useState(() => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("status") ?? ""));
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ orders: Row[]; total: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { const t = setTimeout(() => { setTerm(q); setPage(1); }, 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => {
    const p = new URLSearchParams({ page: String(page) });
    if (status) p.set("status", status);
    if (term) p.set("q", term);
    api<{ orders: Row[]; total: number }>(`/api/admin/orders?${p}`).then((r) => { setData(r); setError(""); }).catch(() => setError("Could not load orders."));
  }, [status, term, page]);

  return (
    <>
      <h1 className="admin-title">Orders</h1>
      <div className="admin-filters">
        <label className="form-field"><span className="sr-only">Search orders</span><input aria-label="Search by order number, name, mobile or email" onChange={(e) => setQ(e.target.value)} placeholder="Search order no., name, mobile, email" type="search" value={q} /></label>
        <label className="form-field"><span className="sr-only">Filter by status</span>
          <select aria-label="Filter by status" onChange={(e) => { setStatus(e.target.value); setPage(1); }} value={status}>
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </label>
      </div>
      {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
      {!data ? <div className="cart-loading" role="status"><span className="spinner" aria-hidden="true" /> Loading…</div> : data.orders.length === 0 ? <p className="muted">No orders match.</p> : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o.orderNumber}>
                  <td><Link className="inline-link" href={`/admin/orders/${o.orderNumber}`}>{o.orderNumber}</Link></td>
                  <td>{formatDate(o.createdAt)}</td>
                  <td>{o.customerName}<br /><span className="muted">{o.mobile} · {o.city}</span></td>
                  <td>{o.itemCount}</td>
                  <td>{formatPaise(o.totalPaise)}</td>
                  <td><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.total > 25 ? (
        <div className="form-actions">
          <button className="button button-outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} type="button">Previous</button>
          <span className="muted">Page {page} of {Math.ceil(data.total / 25)}</span>
          <button className="button button-outline" disabled={page * 25 >= data.total} onClick={() => setPage((p) => p + 1)} type="button">Next</button>
        </div>
      ) : null}
    </>
  );
}

export default function AdminOrdersPage() { return <Suspense fallback={null}><Orders /></Suspense>; }

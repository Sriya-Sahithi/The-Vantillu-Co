"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { formatPaise } from "@/lib/money";

type Stats = { total: number; new_orders: number; preparing: number; dispatched: number; delivered: number; awaiting_payment: number; refunds_open: number; revenue_paise: number };

export default function AdminOverview() {
  const [s, setS] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { api<{ stats: Stats }>("/api/admin/stats").then((r) => setS(r.stats)).catch(() => setError("Could not load stats.")); }, []);
  if (error) return <p className="notice notice-error" role="alert">{error}</p>;
  if (!s) return <div className="cart-loading" role="status"><span className="spinner" aria-hidden="true" /> Loading…</div>;
  const cards: [string, string | number, string?][] = [
    ["Total orders", s.total, "/admin/orders"],
    ["New (paid, to confirm)", s.new_orders, "/admin/orders?status=paid"],
    ["Being prepared", s.preparing, "/admin/orders?status=preparing"],
    ["Dispatched", s.dispatched, "/admin/orders?status=dispatched"],
    ["Delivered", s.delivered, "/admin/orders?status=delivered"],
    ["Awaiting payment", s.awaiting_payment, "/admin/orders?status=payment_pending"],
    ["Refunds in progress", s.refunds_open, "/admin/orders?status=refund_initiated"],
    ["Revenue (verified payments, net of refunds)", formatPaise(s.revenue_paise)],
  ];
  return (
    <>
      <h1 className="admin-title">Overview</h1>
      <div className="stat-grid">
        {cards.map(([label, value, href]) => (
          <div className="stat-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            {href ? <Link className="inline-link" href={href}>View</Link> : null}
          </div>
        ))}
      </div>
      <p className="muted">“Confirmed” and “Preparing” are counted together under “Being prepared”.</p>
    </>
  );
}

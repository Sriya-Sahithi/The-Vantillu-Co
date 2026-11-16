"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDate } from "@/components/order-detail";
import { api } from "@/lib/client/api";
import { formatPaise } from "@/lib/money";

type C = { id: string; email: string; name: string; mobile: string | null; joinedAt: string; orderCount: number; spentPaise: number };

export default function AdminCustomers() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<C[] | null>(null);
  useEffect(() => {
    const t = setTimeout(() => { api<{ customers: C[] }>(`/api/admin/customers?q=${encodeURIComponent(q)}`).then((r) => setRows(r.customers)).catch(() => setRows([])); }, 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <>
      <h1 className="admin-title">Customers</h1>
      <div className="admin-filters"><label className="form-field"><span className="sr-only">Search customers</span><input aria-label="Search customers" onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, mobile" type="search" value={q} /></label></div>
      {!rows ? <div className="cart-loading" role="status"><span className="spinner" aria-hidden="true" /> Loading…</div> : rows.length === 0 ? <p className="muted">No registered customers found. Guest orders appear under Orders.</p> : (
        <div className="table-wrap"><table className="admin-table">
          <thead><tr><th>Customer</th><th>Mobile</th><th>Joined</th><th>Orders</th><th>Paid total</th></tr></thead>
          <tbody>{rows.map((c) => <tr key={c.id}><td><Link className="inline-link" href={`/admin/customers/${c.id}`}>{c.name || c.email}</Link><br /><span className="muted">{c.email}</span></td><td>{c.mobile ?? "—"}</td><td>{formatDate(c.joinedAt)}</td><td>{c.orderCount}</td><td>{formatPaise(c.spentPaise)}</td></tr>)}</tbody>
        </table></div>
      )}
    </>
  );
}

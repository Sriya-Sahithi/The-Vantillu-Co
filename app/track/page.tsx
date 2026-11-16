"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { ClientApiError, api } from "@/lib/client/api";

type Saved = { orderNumber: string; token: string };

export default function TrackPage() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState("");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<Saved[]>([]);

  useEffect(() => {
    try { setRecent(JSON.parse(localStorage.getItem("vantillu-orders") ?? "[]")); } catch { /* ignore */ }
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await api<{ orderNumber: string; token: string }>("/api/orders/lookup", { body: { orderNumber: orderNumber.trim(), mobile: mobile.trim() } });
      router.push(`/order/${data.orderNumber}?t=${data.token}`);
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="page-shell cart-page">
      <div className="cart-heading">
        <span className="eyebrow">Order lookup</span>
        <h1>Find your <em>order.</em></h1>
        <p>Ordered as a guest? Enter your order number and the mobile number you used at checkout.</p>
      </div>
      <form className="checkout-card narrow-form" noValidate onSubmit={submit}>
        <div className="form-field">
          <label htmlFor="trk-no">Order number</label>
          <input autoCapitalize="characters" autoComplete="off" id="trk-no" maxLength={20} onChange={(e) => setOrderNumber(e.target.value)} placeholder="VC-XXXXXXXX" required value={orderNumber} />
        </div>
        <div className="form-field">
          <label htmlFor="trk-mobile">Mobile number</label>
          <input autoComplete="tel-national" id="trk-mobile" inputMode="tel" maxLength={16} onChange={(e) => setMobile(e.target.value)} required value={mobile} />
        </div>
        {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
        <button className="button button-primary" disabled={busy || !orderNumber || !mobile} type="submit">{busy ? <><Loader2 className="spin" size={16} aria-hidden="true" /> Searching…</> : "Find order"}</button>
      </form>
      {recent.length ? (
        <section className="checkout-card narrow-form">
          <h2>Orders on this device</h2>
          <ul className="plain-list">
            {recent.map((o) => <li key={o.orderNumber}><a className="inline-link" href={`/order/${o.orderNumber}?t=${o.token}`}>{o.orderNumber}</a></li>)}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ClientApiError, api } from "@/lib/client/api";
import { paiseToRupeeString } from "@/lib/money";

type Delivery = { enabled: boolean; feePaise: number; freeThresholdPaise: number | null; postcodes: { pattern: string; label: string; enabled: boolean; feePaise: number | null }[] };

export default function AdminDelivery() {
  const [d, setD] = useState<Delivery | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [pc, setPc] = useState({ pattern: "", label: "", fee: "", enabled: true });

  const load = useCallback(async () => {
    const r = await api<{ delivery: Delivery }>("/api/admin/delivery");
    setD(r.delivery); setEnabled(r.delivery.enabled);
  }, []);
  useEffect(() => { void load().catch(() => setErr("Could not load delivery settings.")); }, [load]);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setMsg(""); setErr("");
    try { await fn(); setMsg(ok); await load(); } catch (e) { setErr(e instanceof ClientApiError ? e.message : "Failed."); }
  }
  const saveSettings = (e: FormEvent) => { e.preventDefault(); void run(() => api("/api/admin/delivery", { method: "PUT", body: { enabled, fee, freeThreshold: threshold } }), "Delivery settings saved."); };
  const savePc = (e: FormEvent) => { e.preventDefault(); void run(async () => { await api("/api/admin/delivery/postcodes", { method: "PUT", body: pc }); setPc({ pattern: "", label: "", fee: "", enabled: true }); }, "Service area saved."); };

  if (!d) return err ? <p className="notice notice-error" role="alert">{err}</p> : <div className="cart-loading" role="status"><span className="spinner" aria-hidden="true" /> Loading…</div>;
  return (
    <>
      <h1 className="admin-title">Delivery</h1>
      <div aria-live="polite">{msg ? <p className="notice" role="status">{msg}</p> : null}{err ? <p className="notice notice-error" role="alert">{err}</p> : null}</div>
      <form className="checkout-card narrow-form" onSubmit={saveSettings}>
        <h2>Delivery charges</h2>
        <label className="check-field"><input checked={enabled} onChange={(e) => setEnabled(e.target.checked)} type="checkbox" /> Home delivery is enabled (uncheck to pause all checkouts)</label>
        <div className="notice">
          <strong>Customer delivery pricing</strong>
          <p>Below ₹999: ₹100 delivery charge</p>
          <p>₹999 and above: ₹50 delivery charge</p>
          <small>Calculated automatically on the product subtotal. PIN-code fee overrides are not used.</small>
        </div>
        <button className="button button-primary" type="submit">Save</button>
      </form>
      <section className="checkout-card">
        <h2>Serviceable PIN codes</h2>
        <p className="muted">Enter a full PIN (500081) or a prefix (500 covers 500000–500999). The most specific rule wins, so you can allow a region and block one PIN inside it. Only listed areas can check out.</p>
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>PIN / prefix</th><th>Label</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {d.postcodes.map((p) => (
                <tr key={p.pattern}>
                  <td>{p.pattern}</td><td>{p.label}</td><td>{p.enabled ? "Serviceable" : "Blocked"}</td>
                  <td className="row-actions">
                    <button className="text-button" onClick={() => setPc({ pattern: p.pattern, label: p.label, fee: "", enabled: p.enabled })} type="button">Edit</button>
                    <button className="text-button" onClick={() => { if (window.confirm(`Remove ${p.pattern}?`)) void run(() => api(`/api/admin/delivery/postcodes?pattern=${p.pattern}`, { method: "DELETE" }), "Removed."); }} type="button">Remove</button>
                  </td>
                </tr>
              ))}
              {d.postcodes.length === 0 ? <tr><td colSpan={4} className="muted">No areas yet — nobody can check out.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <form className="form-grid" onSubmit={savePc}>
          <div className="form-field"><label htmlFor="pc-p">PIN or prefix</label><input id="pc-p" inputMode="numeric" maxLength={6} onChange={(e) => setPc({ ...pc, pattern: e.target.value.replace(/\D/g, "") })} required value={pc.pattern} /></div>
          <div className="form-field"><label htmlFor="pc-l">Label</label><input id="pc-l" maxLength={80} onChange={(e) => setPc({ ...pc, label: e.target.value })} value={pc.label} /></div>
          <label className="check-field"><input checked={pc.enabled} onChange={(e) => setPc({ ...pc, enabled: e.target.checked })} type="checkbox" /> Serviceable</label>
          <div className="form-actions wide"><button className="button button-primary" type="submit">Save area</button></div>
        </form>
      </section>
    </>
  );
}

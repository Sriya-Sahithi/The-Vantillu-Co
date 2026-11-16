"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ClientApiError, api } from "@/lib/client/api";
import { formatPaise, paiseToRupeeString } from "@/lib/money";

type P = { id: string; slug: string; name: string; categoryId: string; categoryName: string; description: string; imageUrl: string; imageAlt: string; pricePaise: number | null; packLabel: string | null; stock: number; isAvailable: boolean; archived: boolean; ingredients: string | null; allergens: string | null; netQuantity: string | null; shelfLife: string | null; storage: string | null };
type Form = { id?: string; name: string; categoryId: string; description: string; imageUrl: string; imageAlt: string; price: string; packLabel: string; stock: string; isAvailable: boolean; ingredients: string; allergens: string; netQuantity: string; shelfLife: string; storage: string };

const toForm = (p: P): Form => ({ id: p.id, name: p.name, categoryId: p.categoryId, description: p.description, imageUrl: p.imageUrl, imageAlt: p.imageAlt, price: p.pricePaise === null ? "" : paiseToRupeeString(p.pricePaise), packLabel: p.packLabel ?? "", stock: String(p.stock), isAvailable: p.isAvailable, ingredients: p.ingredients ?? "", allergens: p.allergens ?? "", netQuantity: p.netQuantity ?? "", shelfLife: p.shelfLife ?? "", storage: p.storage ?? "" });

export default function AdminProducts() {
  const [list, setList] = useState<P[] | null>(null);
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => { const r = await api<{ products: P[]; categories: { id: string; name: string }[] }>("/api/admin/products"); setList(r.products); setCats(r.categories); }, []);
  useEffect(() => { void load().catch(() => setErr("Could not load products.")); }, [load]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true); setErr(""); setMsg("");
    const body = { name: form.name, categoryId: form.categoryId, description: form.description, imageUrl: form.imageUrl, imageAlt: form.imageAlt, price: form.price.trim() === "" ? null : form.price, packLabel: form.packLabel, stock: Number(form.stock), isAvailable: form.isAvailable, ingredients: form.ingredients, allergens: form.allergens, netQuantity: form.netQuantity, shelfLife: form.shelfLife, storage: form.storage };
    try {
      if (form.id) await api(`/api/admin/products/${form.id}`, { method: "PATCH", body });
      else await api("/api/admin/products", { body });
      setForm(null); setMsg("Product saved."); await load();
    } catch (e2) { setErr(e2 instanceof ClientApiError ? e2.message : "Could not save."); }
    finally { setBusy(false); }
  }

  async function upload(file: File | undefined) {
    if (!file || !form) return;
    setErr("");
    const fd = new FormData(); fd.append("file", file);
    try { const r = await api<{ url: string }>("/api/admin/upload", { formData: fd }); setForm((f) => (f ? { ...f, imageUrl: r.url } : f)); }
    catch (e) { setErr(e instanceof ClientApiError ? e.message : "Upload failed."); }
  }

  async function archive(p: P) {
    if (!window.confirm(p.archived ? `Restore ${p.name}?` : `Archive ${p.name}? It will disappear from the shop; past orders are unaffected.`)) return;
    try { await api(`/api/admin/products/${p.id}${p.archived ? "?restore=1" : ""}`, { method: "DELETE" }); await load(); } catch { setErr("Could not update the product."); }
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const text = (k: keyof Form, label: string, props: { required?: boolean; inputMode?: "decimal" | "numeric"; hint?: string } = {}) => (
    <div className="form-field"><label htmlFor={`pr-${k}`}>{label}{props.hint ? <span> ({props.hint})</span> : null}</label><input id={`pr-${k}`} inputMode={props.inputMode} maxLength={500} onChange={(e) => set(k, e.target.value as never)} required={props.required} value={String(form?.[k] ?? "")} /></div>
  );

  return (
    <>
      <div className="card-head"><h1 className="admin-title">Products</h1>{!form ? <button className="button button-primary" onClick={() => setForm({ name: "", categoryId: cats[0]?.id ?? "", description: "", imageUrl: "", imageAlt: "", price: "", packLabel: "", stock: "0", isAvailable: false, ingredients: "", allergens: "", netQuantity: "", shelfLife: "", storage: "" })} type="button">Add product</button> : null}</div>
      <div aria-live="polite">{msg ? <p className="notice" role="status">{msg}</p> : null}{err ? <p className="notice notice-error" role="alert">{err}</p> : null}</div>
      <p className="muted">A product can be ordered online only when it has a price, is marked available, and has stock. Products without a price stay “enquire on WhatsApp”.</p>
      {form ? (
        <form className="checkout-card" onSubmit={save}>
          <h2>{form.id ? "Edit product" : "New product"}</h2>
          <div className="form-grid">
            {text("name", "Name", { required: true })}
            <div className="form-field"><label htmlFor="pr-cat">Category</label><select id="pr-cat" onChange={(e) => set("categoryId", e.target.value)} required value={form.categoryId}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            {text("price", "Price (₹)", { inputMode: "decimal", hint: "empty = enquiry only" })}
            {text("packLabel", "Pack size", { hint: "e.g. 250 g" })}
            {text("stock", "Stock (units)", { inputMode: "numeric", required: true })}
            <label className="check-field"><input checked={form.isAvailable} onChange={(e) => set("isAvailable", e.target.checked)} type="checkbox" /> Available for sale</label>
            <div className="form-field wide"><label htmlFor="pr-desc">Description</label><textarea id="pr-desc" maxLength={2000} onChange={(e) => set("description", e.target.value)} rows={4} value={form.description} /></div>
            <div className="form-field wide">
              <label htmlFor="pr-img">Image</label>
              {form.imageUrl ? <div className="admin-thumb"><Image alt="" fill sizes="120px" src={form.imageUrl} unoptimized={form.imageUrl.startsWith("/api/")} /></div> : null}
              <input accept="image/png,image/jpeg,image/webp" id="pr-img" onChange={(e) => void upload(e.target.files?.[0])} type="file" />
            </div>
            {text("imageAlt", "Image description (alt text)")}
            {text("ingredients", "Ingredients")}
            {text("allergens", "Allergen information")}
            {text("netQuantity", "Net quantity")}
            {text("shelfLife", "Shelf life")}
            {text("storage", "Storage")}
          </div>
          <div className="form-actions"><button className="button button-primary" disabled={busy} type="submit">{busy ? "Saving…" : "Save product"}</button><button className="button button-outline" onClick={() => setForm(null)} type="button">Cancel</button></div>
        </form>
      ) : null}
      {!list ? <div className="cart-loading" role="status"><span className="spinner" aria-hidden="true" /> Loading…</div> : (
        <div className="table-wrap"><table className="admin-table">
          <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
          <tbody>{list.map((p) => (
            <tr className={p.archived ? "archived" : ""} key={p.id}>
              <td>{p.name}<br /><span className="muted">/{p.slug}</span></td><td>{p.categoryName}</td>
              <td>{p.pricePaise === null ? <span className="muted">Enquiry</span> : formatPaise(p.pricePaise)}</td><td>{p.stock}</td>
              <td>{p.archived ? "Archived" : p.pricePaise === null ? "Enquiry only" : !p.isAvailable ? "Unavailable" : p.stock <= 0 ? "Out of stock" : "On sale"}</td>
              <td className="row-actions"><button className="text-button" onClick={() => { setForm(toForm(p)); window.scrollTo({ top: 0, behavior: "smooth" }); }} type="button">Edit</button><button className="text-button" onClick={() => void archive(p)} type="button">{p.archived ? "Restore" : "Archive"}</button></td>
            </tr>))}</tbody>
        </table></div>
      )}
    </>
  );
}

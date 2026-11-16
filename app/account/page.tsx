"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { AccountShell } from "@/components/account-shell";
import { ClientApiError, api } from "@/lib/client/api";
import { INDIAN_STATES, type FieldErrors } from "@/lib/validation";

type Address = { id: string; label: string; fullName: string; mobile: string; house: string; street: string; landmark: string; city: string; district: string; state: string; pincode: string; isDefault: boolean };
const BLANK = { label: "Home", fullName: "", mobile: "", house: "", street: "", landmark: "", city: "", district: "", state: "", pincode: "", isDefault: false };

function Profile() {
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [editing, setEditing] = useState<(Omit<Address, "id"> & { id?: string }) | null>(null);
  const [addrErrors, setAddrErrors] = useState<FieldErrors>({});
  const [addrBusy, setAddrBusy] = useState(false);

  const loadAddresses = useCallback(async () => setAddresses((await api<{ addresses: Address[] }>("/api/account/addresses")).addresses), []);
  useEffect(() => {
    api<{ profile: { fullName: string; mobile: string } }>("/api/account/profile").then((r) => { setFullName(r.profile.fullName); setMobile(r.profile.mobile); }).catch(() => undefined);
    void loadAddresses().catch(() => undefined);
  }, [loadAddresses]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMsg(""); setErr(""); setFieldErr({});
    try { await api("/api/account/profile", { method: "PUT", body: { fullName, mobile } }); setMsg("Profile saved."); }
    catch (e) { if (e instanceof ClientApiError) { setErr(e.message); setFieldErr(e.fields ?? {}); } }
    finally { setBusy(false); }
  }

  async function saveAddress(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setAddrBusy(true); setAddrErrors({});
    try {
      if (editing.id) await api(`/api/account/addresses/${editing.id}`, { method: "PUT", body: editing });
      else await api("/api/account/addresses", { body: editing });
      setEditing(null);
      await loadAddresses();
    } catch (e) { if (e instanceof ClientApiError) setAddrErrors({ ...(e.fields as FieldErrors), fullName: e.fields?.fullName ?? (e.fields ? undefined : e.message) }); }
    finally { setAddrBusy(false); }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this address?")) return;
    await api(`/api/account/addresses/${id}`, { method: "DELETE" });
    await loadAddresses();
  }

  const set = (k: keyof typeof BLANK, v: string | boolean) => setEditing((c) => (c ? { ...c, [k]: v } : c));
  const input = (k: keyof typeof BLANK, label: string, optional = false) => (
    <div className="form-field">
      <label htmlFor={`ad-${k}`}>{label}{optional ? <span> (optional)</span> : null}</label>
      <input aria-invalid={addrErrors[k as keyof FieldErrors] ? true : undefined} id={`ad-${k}`} maxLength={120} onChange={(e) => set(k, e.target.value)} required={!optional} value={String(editing?.[k] ?? "")} />
      {addrErrors[k as keyof FieldErrors] ? <p className="field-error" role="alert">{addrErrors[k as keyof FieldErrors]}</p> : null}
    </div>
  );

  return (
    <>
      <form className="checkout-card narrow-form" onSubmit={save}>
        <h2>Profile</h2>
        <div className="form-field"><label htmlFor="pf-name">Full name</label><input autoComplete="name" id="pf-name" maxLength={80} onChange={(e) => setFullName(e.target.value)} value={fullName} /></div>
        <div className="form-field">
          <label htmlFor="pf-mobile">Mobile number</label>
          <input aria-invalid={fieldErr.mobile ? true : undefined} autoComplete="tel-national" id="pf-mobile" inputMode="tel" maxLength={16} onChange={(e) => setMobile(e.target.value)} value={mobile} />
          {fieldErr.mobile ? <p className="field-error" role="alert">{fieldErr.mobile}</p> : null}
        </div>
        {msg ? <p className="notice" role="status">{msg}</p> : null}
        {err && !fieldErr.mobile ? <p className="notice notice-error" role="alert">{err}</p> : null}
        <button className="button button-primary" disabled={busy} type="submit">{busy ? <Loader2 className="spin" size={16} aria-hidden="true" /> : null} Save profile</button>
      </form>

      <section className="checkout-card">
        <div className="card-head"><h2>Saved addresses</h2>{!editing ? <button className="button button-outline" onClick={() => { setAddrErrors({}); setEditing({ ...BLANK, fullName, mobile }); }} type="button">Add address</button> : null}</div>
        {!addresses.length && !editing ? <p className="muted">No saved addresses yet. They make checkout faster.</p> : null}
        <ul className="address-list">
          {addresses.map((a) => (
            <li key={a.id}>
              <div><strong>{a.label}{a.isDefault ? " · Default" : ""}</strong><p>{a.fullName}, {a.mobile}<br />{a.house}, {a.street}{a.landmark ? `, ${a.landmark}` : ""}<br />{a.city}, {a.district}, {a.state} {a.pincode}</p></div>
              <div className="row-actions">
                <button aria-label={`Edit ${a.label}`} className="icon-button" onClick={() => { setAddrErrors({}); setEditing(a); }} type="button"><Pencil size={16} /></button>
                <button aria-label={`Delete ${a.label}`} className="icon-button" onClick={() => remove(a.id)} type="button"><Trash2 size={16} /></button>
              </div>
            </li>
          ))}
        </ul>
        {editing ? (
          <form className="form-grid" noValidate onSubmit={saveAddress}>
            {input("label", "Label (e.g. Home)")}
            {input("fullName", "Full name")}
            {input("mobile", "Mobile number")}
            {input("house", "House / flat number")}
            {input("street", "Street / area")}
            {input("landmark", "Landmark", true)}
            {input("city", "Village / town / city")}
            {input("district", "District")}
            <div className="form-field">
              <label htmlFor="ad-state">State</label>
              <select id="ad-state" onChange={(e) => set("state", e.target.value)} required value={editing.state}><option value="">Select state</option>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}</select>
              {addrErrors.state ? <p className="field-error" role="alert">{addrErrors.state}</p> : null}
            </div>
            {input("pincode", "PIN code")}
            <label className="check-field wide"><input checked={editing.isDefault} onChange={(e) => set("isDefault", e.target.checked)} type="checkbox" /> Make this my default address</label>
            <div className="form-actions wide">
              <button className="button button-primary" disabled={addrBusy} type="submit">{addrBusy ? "Saving…" : "Save address"}</button>
              <button className="button button-outline" onClick={() => setEditing(null)} type="button">Cancel</button>
            </div>
          </form>
        ) : null}
      </section>
    </>
  );
}

export default function AccountPage() {
  return <AccountShell title={<>Your <em>profile.</em></>}>{() => <Profile />}</AccountShell>;
}

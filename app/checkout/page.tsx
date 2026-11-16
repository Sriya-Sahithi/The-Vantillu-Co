"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { useQuote } from "@/components/use-quote";
import { ClientApiError, api, rememberOrder } from "@/lib/client/api";
import { openCheckout, type PaymentSession } from "@/lib/client/razorpay";
import { formatPaise } from "@/lib/money";
import { INDIAN_STATES, isValidPincode, validateCheckoutFields, type CheckoutFields, type FieldErrors } from "@/lib/validation";

const EMPTY: CheckoutFields = { fullName: "", mobile: "", email: "", house: "", street: "", landmark: "", city: "", district: "", state: "", pincode: "" };
const DRAFT_KEY = "vantillu-checkout-draft";
const KEY_STORE = "vantillu-checkout-key";

type SavedAddress = { id: string; label: string; fullName: string; mobile: string; house: string; street: string; landmark: string; city: string; district: string; state: string; pincode: string; isDefault: boolean };

function newKey() {
  return `ck_${crypto.randomUUID().replace(/-/g, "")}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, hydrated, clear } = useCart();
  const [fields, setFields] = useState<CheckoutFields>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof CheckoutFields, boolean>>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [info, setInfo] = useState("");
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [signedIn, setSignedIn] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<PaymentSession | null>(null);
  const pinForQuote = isValidPincode(fields.pincode) ? fields.pincode : null;
  const { quote, loading, error: quoteError } = useQuote(items, hydrated, pinForQuote);
  const errorRefs = useRef<Record<string, HTMLElement | null>>({});

  // Restore the draft (never includes payment data) and any saved addresses.
  useEffect(() => {
    try {
      const draft = sessionStorage.getItem(DRAFT_KEY);
      if (draft) setFields({ ...EMPTY, ...JSON.parse(draft) });
    } catch { /* ignore */ }
    api<{ user: { email: string } | null }>("/api/auth/me").then(async (me) => {
      if (!me.user) return;
      setSignedIn(me.user.email);
      const [{ addresses }, { profile }] = await Promise.all([
        api<{ addresses: SavedAddress[] }>("/api/account/addresses"),
        api<{ profile: { fullName: string; mobile: string; email: string } }>("/api/account/profile"),
      ]);
      setSaved(addresses);
      setFields((current) => {
        if (current.house || current.fullName) return { ...current, email: current.email || profile.email };
        const first = addresses.find((a) => a.isDefault) ?? addresses[0];
        return first
          ? { ...current, fullName: first.fullName, mobile: first.mobile, email: profile.email, house: first.house, street: first.street, landmark: first.landmark, city: first.city, district: first.district, state: first.state, pincode: first.pincode }
          : { ...current, fullName: profile.fullName, mobile: profile.mobile, email: profile.email };
      });
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(fields)); } catch { /* ignore */ }
  }, [fields]);

  const live = useMemo(() => validateCheckoutFields(fields), [fields]);
  const shown: FieldErrors = { ...Object.fromEntries(Object.entries(live.errors).filter(([key]) => touched[key as keyof CheckoutFields])), ...errors };
  const serviceable = quote?.delivery.serviceable;
  const canSubmit = !busy && quote && quote.issues.length === 0 && quote.lines.length > 0;

  function update(key: keyof CheckoutFields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
    setErrors((current) => { const { [key]: _removed, ...rest } = current; void _removed; return rest; });
  }
  const blur = (key: keyof CheckoutFields) => () => setTouched((current) => ({ ...current, [key]: true }));

  function field(key: keyof CheckoutFields, label: string, props: { optional?: boolean; type?: string; autoComplete?: string; inputMode?: "numeric" | "tel" | "email" | "text"; maxLength?: number; placeholder?: string; wide?: boolean } = {}) {
    const error = shown[key];
    const id = `co-${key}`;
    return (
      <div className={`form-field${props.wide ? " wide" : ""}`}>
        <label htmlFor={id}>{label}{props.optional ? <span> (optional)</span> : null}</label>
        <input
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete={props.autoComplete}
          id={id}
          inputMode={props.inputMode}
          maxLength={props.maxLength ?? 120}
          name={key}
          onBlur={blur(key)}
          onChange={(event) => update(key, event.target.value)}
          placeholder={props.placeholder}
          ref={(node) => { errorRefs.current[key] = node; }}
          required={!props.optional}
          type={props.type ?? "text"}
          value={fields[key]}
        />
        {error ? <p className="field-error" id={`${id}-error`} role="alert">{error}</p> : null}
      </div>
    );
  }

  async function startPayment(session: PaymentSession) {
    setInfo("Opening secure payment…");
    let lastFailure = "";
    try {
      const result = await openCheckout(session, { name: fields.fullName, email: fields.email || undefined, contact: fields.mobile }, {
        onFailedAttempt: (message) => { lastFailure = message; setFormError(message); },
      });
      if (result === "dismissed") {
        setPendingSession(session);
        setInfo("");
        setFormError(`${lastFailure ? `${lastFailure} ` : ""}Payment was not completed. Your order is held for a short time — you can pay now or come back later from your order page.`);
        return;
      }
      rememberOrder(session.orderNumber, session.accessToken);
      clear();
      try { sessionStorage.removeItem(DRAFT_KEY); sessionStorage.removeItem(KEY_STORE); } catch { /* ignore */ }
      router.push(`/order/${session.orderNumber}?t=${session.accessToken}`);
    } catch (error) {
      setPendingSession(session);
      setInfo("");
      setFormError(error instanceof ClientApiError ? error.message : "We could not complete the payment. Please try again.");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    setInfo("");
    if (pendingSession) {
      setBusy(true);
      try {
        const { session } = await api<{ session: PaymentSession }>("/api/checkout/retry", { body: { orderNumber: pendingSession.orderNumber, token: pendingSession.accessToken } });
        await startPayment(session);
      } catch (error) {
        setFormError(error instanceof ClientApiError ? error.message : "Could not restart payment.");
      } finally {
        setBusy(false);
      }
      return;
    }
    setTouched(Object.fromEntries(Object.keys(fields).map((k) => [k, true])));
    if (!live.ok) {
      const first = Object.keys(live.errors)[0];
      errorRefs.current[first]?.focus();
      setFormError("Please correct the highlighted fields.");
      return;
    }
    if (serviceable === false) {
      setFormError(quote?.delivery.message ?? "We cannot deliver to this PIN code.");
      errorRefs.current.pincode?.focus();
      return;
    }
    setBusy(true);
    try {
      let key = sessionStorage.getItem(KEY_STORE);
      if (!key) { key = newKey(); sessionStorage.setItem(KEY_STORE, key); }
      const { session } = await api<{ session: PaymentSession }>("/api/checkout", { body: { items, fields, idempotencyKey: key } });
      setPendingSession(session);
      await startPayment(session);
    } catch (error) {
      if (error instanceof ClientApiError) {
        if (error.fields) setErrors(error.fields as FieldErrors);
        if (error.code === "idempotency_conflict") try { sessionStorage.removeItem(KEY_STORE); } catch { /* ignore */ }
        setFormError(error.message);
      } else setFormError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!hydrated) return <div className="page-shell checkout-page"><div className="cart-loading" role="status"><span className="spinner" aria-hidden="true" /> Loading…</div></div>;
  if (!items.length && !pendingSession) {
    return (
      <div className="page-shell checkout-page">
        <div className="empty-cart">
          <span className="empty-cart-mark" aria-hidden="true"><Image alt="" height={72} src="/brand/kitchen-seal.webp" width={72} /></span>
          <h2>Your cart is empty.</h2>
          <p>Add something homemade before checking out.</p>
          <Link className="button button-primary" href="/shop">Explore the shop</Link>
        </div>
      </div>
    );
  }

  const fee = quote?.deliveryFeePaise;
  return (
    <div className="page-shell checkout-page">
      <Link className="back-link" href="/cart"><ArrowLeft size={16} /> Back to cart</Link>
      <div className="cart-heading">
        <span className="eyebrow">Secure checkout</span>
        <h1>Almost <em>yours.</em></h1>
        <p>{signedIn ? `Signed in as ${signedIn}.` : "No account needed."} {signedIn ? "" : <Link className="inline-link" href="/account/login?next=/checkout">Sign in</Link>} {signedIn ? "" : "for saved addresses."}</p>
      </div>
      <form className="checkout-layout" noValidate onSubmit={submit}>
        <div className="checkout-fields">
          {saved.length > 0 ? (
            <section aria-label="Saved addresses" className="checkout-card">
              <h2>Saved addresses</h2>
              <div className="saved-address-list">
                {saved.map((a) => (
                  <button className="saved-address" key={a.id} onClick={() => { setFields((c) => ({ ...c, fullName: a.fullName, mobile: a.mobile, house: a.house, street: a.street, landmark: a.landmark, city: a.city, district: a.district, state: a.state, pincode: a.pincode })); setErrors({}); }} type="button">
                    <strong>{a.label}</strong><span>{a.house}, {a.street}, {a.city} {a.pincode}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          <fieldset className="checkout-card" disabled={Boolean(pendingSession)}>
            <legend>1 · Your details</legend>
            <div className="form-grid">
              {field("fullName", "Full name", { autoComplete: "name", maxLength: 80, wide: true })}
              {field("mobile", "Mobile number", { autoComplete: "tel-national", inputMode: "tel", maxLength: 16, placeholder: "10-digit number" })}
              {field("email", "Email address", { autoComplete: "email", inputMode: "email", optional: true, type: "email", maxLength: 254 })}
            </div>
          </fieldset>
          <fieldset className="checkout-card" disabled={Boolean(pendingSession)}>
            <legend>2 · Delivery address <span className="legend-note">Home delivery only</span></legend>
            <div className="form-grid">
              {field("house", "House / flat number", { autoComplete: "address-line1", maxLength: 100 })}
              {field("street", "Street / area", { autoComplete: "address-line2" })}
              {field("landmark", "Landmark", { optional: true, wide: true, maxLength: 100 })}
              {field("city", "Village / town / city", { autoComplete: "address-level2", maxLength: 80 })}
              {field("district", "District", { maxLength: 80 })}
              <div className="form-field">
                <label htmlFor="co-state">State</label>
                <select aria-describedby={shown.state ? "co-state-error" : undefined} aria-invalid={shown.state ? true : undefined} autoComplete="address-level1" id="co-state" name="state" onBlur={blur("state")} onChange={(event) => update("state", event.target.value)} ref={(node) => { errorRefs.current.state = node; }} required value={fields.state}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                </select>
                {shown.state ? <p className="field-error" id="co-state-error" role="alert">{shown.state}</p> : null}
              </div>
              {field("pincode", "PIN code", { autoComplete: "postal-code", inputMode: "numeric", maxLength: 6, placeholder: "6 digits" })}
            </div>
            {pinForQuote && loading ? <p className="pin-status" role="status">Checking delivery to {pinForQuote}…</p> : null}
            {pinForQuote && !loading && serviceable === true ? <p className="pin-status ok" role="status">We deliver to {pinForQuote}.</p> : null}
            {pinForQuote && !loading && serviceable === false ? <p className="pin-status bad" role="alert">{quote?.delivery.message}</p> : null}
          </fieldset>
          <div aria-live="assertive">
            {formError ? <p className="notice notice-error" role="alert">{formError}</p> : null}
            {info && !formError ? <p className="notice" role="status">{info}</p> : null}
          </div>
        </div>
        <aside aria-busy={loading} aria-label="Order summary" className="order-summary checkout-summary">
          <span className="eyebrow">Order summary</span>
          <h2>Your order</h2>
          {quoteError ? <p className="notice notice-error" role="alert">{quoteError}</p> : null}
          <ul className="summary-items">
            {quote?.lines.map((line) => (
              <li key={line.slug}>
                <span className="summary-thumb">{line.image ? <Image alt="" fill sizes="52px" src={line.image} /> : null}</span>
                <span className="summary-name">{line.name}<small>{line.quantity} × {formatPaise(line.unitPricePaise)}</small></span>
                <strong>{formatPaise(line.lineTotalPaise)}</strong>
              </li>
            ))}
          </ul>
          {quote?.issues.map((issue) => <p className="cart-issue" key={issue.slug} role="alert">{issue.message} <Link className="inline-link" href="/cart">Update cart</Link></p>)}
          <div className="summary-line"><span>Subtotal</span><strong>{formatPaise(quote?.subtotalPaise ?? 0)}</strong></div>
          <div className="summary-line"><span>Delivery</span><strong>{fee === null || fee === undefined ? "Enter PIN code" : fee === 0 ? "Free" : formatPaise(fee)}</strong></div>
          <div className="summary-line summary-total"><span>Total payable</span><strong>{quote?.totalPaise != null ? formatPaise(quote.totalPaise) : "—"}</strong></div>
          <button className="button button-primary summary-button" disabled={!canSubmit || (!pendingSession && serviceable === false)} type="submit">
            {busy ? <><Loader2 className="spin" size={16} aria-hidden="true" /> Please wait…</> : <><Lock size={15} aria-hidden="true" /> {pendingSession ? "Pay now" : quote?.totalPaise != null ? `Pay ${formatPaise(quote.totalPaise)}` : "Continue to payment"}</>}
          </button>
          <p className="privacy-note"><ShieldCheck size={13} aria-hidden="true" /> Pay securely with UPI, cards, net banking or wallets via Razorpay. Your order is confirmed only after the payment is verified.</p>
        </aside>
      </form>
    </div>
  );
}

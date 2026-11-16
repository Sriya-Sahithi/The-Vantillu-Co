"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { ClientApiError, api, safeNext } from "@/lib/client/api";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function request(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/auth/request", { body: { email } });
      setStep("code");
      setInfo(`We emailed a 6-digit code to ${email}. It is valid for 10 minutes.`);
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/auth/verify", { body: { email, code, name } });
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Could not sign you in.");
      setBusy(false);
    }
  }

  return (
    <div className="page-shell cart-page">
      <div className="cart-heading">
        <span className="eyebrow">Your account</span>
        <h1>Sign in or <em>register.</em></h1>
        <p>No password to remember. We’ll email you a one-time code. New here? Your account is created automatically. Accounts are optional — you can always check out as a guest.</p>
      </div>
      {step === "email" ? (
        <form className="checkout-card narrow-form" noValidate onSubmit={request}>
          <div className="form-field">
            <label htmlFor="login-email">Email address</label>
            <input autoComplete="email" id="login-email" inputMode="email" maxLength={254} onChange={(e) => setEmail(e.target.value)} required type="email" value={email} />
          </div>
          {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
          <button className="button button-primary" disabled={busy || !email} type="submit">{busy ? <><Loader2 className="spin" size={16} aria-hidden="true" /> Sending…</> : "Email me a code"}</button>
        </form>
      ) : (
        <form className="checkout-card narrow-form" noValidate onSubmit={verify}>
          <p className="notice" role="status">{info}</p>
          <div className="form-field">
            <label htmlFor="login-code">6-digit code</label>
            <input autoComplete="one-time-code" id="login-code" inputMode="numeric" maxLength={6} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} pattern="\d{6}" required value={code} />
          </div>
          <div className="form-field">
            <label htmlFor="login-name">Your name <span>(optional, for new accounts)</span></label>
            <input autoComplete="name" id="login-name" maxLength={80} onChange={(e) => setName(e.target.value)} value={name} />
          </div>
          {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
          <button className="button button-primary" disabled={busy || code.length !== 6} type="submit">{busy ? <><Loader2 className="spin" size={16} aria-hidden="true" /> Checking…</> : "Continue"}</button>
          <button className="text-button" disabled={busy} onClick={() => void request()} type="button">Send a new code</button>
          <button className="text-button" onClick={() => { setStep("email"); setCode(""); setError(""); }} type="button">Use a different email</button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginForm /></Suspense>;
}

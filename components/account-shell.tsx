"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ClientApiError, api } from "@/lib/client/api";

const tabs = [
  { href: "/account", label: "Profile" },
  { href: "/account/orders", label: "My orders" },
];

/** Gate for account pages: redirects to sign-in when there is no session. The server still enforces access on every API call. */
export function AccountShell({ title, children }: { title: React.ReactNode; children: (user: { email: string; isAdmin: boolean }) => React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ email: string; isAdmin: boolean } | null>(null);

  useEffect(() => {
    api<{ user: { email: string; isAdmin: boolean } | null }>("/api/auth/me").then((r) => {
      if (!r.user) router.replace(`/account/login?next=${encodeURIComponent(pathname)}`);
      else setUser(r.user);
    }).catch((e) => { if (e instanceof ClientApiError) router.replace("/account/login"); });
  }, [router, pathname]);

  async function logout() {
    await api("/api/auth/logout", { body: {} }).catch(() => undefined);
    window.location.assign("/");
  }

  if (!user) return <div className="page-shell cart-page"><div className="cart-loading" role="status"><span className="spinner" aria-hidden="true" /> Loading…</div></div>;
  return (
    <div className="page-shell cart-page">
      <div className="cart-heading"><span className="eyebrow">My account</span><h1>{title}</h1><p>Signed in as {user.email}</p></div>
      <nav aria-label="Account" className="account-tabs">
        {tabs.map((t) => <Link aria-current={pathname === t.href ? "page" : undefined} className={pathname === t.href ? "active" : ""} href={t.href} key={t.href}>{t.label}</Link>)}
        {user.isAdmin ? <Link href="/admin">Admin</Link> : null}
        <button className="text-button" onClick={logout} type="button">Sign out</button>
      </nav>
      {children(user)}
    </div>
  );
}

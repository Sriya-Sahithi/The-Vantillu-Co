import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const nav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/delivery", label: "Delivery" },
  { href: "/admin/customers", label: "Customers" },
];

/**
 * Server-side gate: non-admins never receive any admin page. (Every /api/admin/* route also
 * re-checks the role, so this layout is a convenience, not the security boundary.)
 */
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!hasDatabase()) notFound();
  const user = await getCurrentUser();
  if (!user) redirect("/account/login?next=/admin");
  if (!user.isAdmin) notFound();
  return (
    <div className="page-shell admin-shell">
      <div className="admin-bar">
        <strong>Admin</strong>
        <nav aria-label="Admin">{nav.map((n) => <Link href={n.href} key={n.href}>{n.label}</Link>)}</nav>
        <span className="muted">{user.email}</span>
      </div>
      {children}
    </div>
  );
}

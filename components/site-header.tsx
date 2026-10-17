"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { siteConfig } from "@/lib/site-config";

const links = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/story", label: "Our story" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { count } = useCart();

  return (
    <>
      <div className="announcement">{siteConfig.announcement}</div>
      <header className="site-header">
        <div className="header-inner">
          <button
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            className="icon-button mobile-menu-button"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
          <Link className="wordmark" href="/" onClick={() => setOpen(false)}>
            <span className="wordmark-mark" aria-hidden="true">వ</span>
            <span>The Vantillu <i>Co.</i></span>
          </Link>
          <nav aria-label="Main navigation" className={`main-nav${open ? " is-open" : ""}`}>
            {links.map((link) => (
              <Link href={link.href} key={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <Link aria-label="Search products" className="icon-button" href="/shop?focus=search">
              <Search size={20} strokeWidth={1.7} />
            </Link>
            <Link aria-label={`Shopping enquiry, ${count} items`} className="icon-button cart-link" href="/cart">
              <ShoppingBag size={20} strokeWidth={1.7} />
              <span className="cart-count">{count}</span>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

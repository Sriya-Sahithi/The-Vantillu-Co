"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { MAX_LINE_QUANTITY } from "@/lib/catalog-types";

export type CartItem = { slug: string; quantity: number };

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  addItem: (slug: string, quantity?: number) => void;
  setQuantity: (slug: string, quantity: number) => void;
  removeItem: (slug: string) => void;
  clear: () => void;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "vantillu-cart-v2";
const LEGACY_KEY = "vantillu-cart";
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function sanitize(parsed: unknown): CartItem[] {
  if (!Array.isArray(parsed)) return [];
  const merged = new Map<string, number>();
  for (const entry of parsed) {
    const value = entry as Record<string, unknown> | null;
    if (!value || typeof value.slug !== "string" || !SLUG.test(value.slug) || !Number.isInteger(value.quantity) || Number(value.quantity) < 1) continue;
    merged.set(value.slug, Math.min(MAX_LINE_QUANTITY, (merged.get(value.slug) ?? 0) + Number(value.quantity)));
  }
  return [...merged].map(([slug, quantity]) => ({ slug, quantity }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      // v2 cart, falling back to the previous enquiry basket (same slugs, no pack ids).
      const saved = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_KEY);
      if (saved) setItems(sanitize(JSON.parse(saved)));
    } catch (error) {
      console.error("Unable to restore the saved cart.", error);
    } finally {
      setHydrated(true);
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        try {
          setItems(sanitize(JSON.parse(event.newValue ?? "[]")));
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Unable to save the cart in this browser.", error);
    }
  }, [hydrated, items]);

  const addItem = useCallback((slug: string, quantity = 1) => {
    if (!SLUG.test(slug) || !Number.isInteger(quantity) || quantity < 1) return;
    setItems((current) => {
      const existing = current.find((item) => item.slug === slug);
      if (existing) return current.map((item) => (item.slug === slug ? { ...item, quantity: Math.min(MAX_LINE_QUANTITY, item.quantity + quantity) } : item));
      return [...current, { slug, quantity: Math.min(MAX_LINE_QUANTITY, quantity) }];
    });
  }, []);
  const setQuantity = useCallback((slug: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity < 1) return;
    setItems((current) => current.map((item) => (item.slug === slug ? { ...item, quantity: Math.min(MAX_LINE_QUANTITY, quantity) } : item)));
  }, []);
  const removeItem = useCallback((slug: string) => setItems((current) => current.filter((item) => item.slug !== slug)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, hydrated, addItem, setQuantity, removeItem, clear, count: items.reduce((total, item) => total + item.quantity, 0) }),
    [items, hydrated, addItem, setQuantity, removeItem, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider.");
  return context;
}

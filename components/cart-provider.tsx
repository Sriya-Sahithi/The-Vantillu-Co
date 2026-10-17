"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getProduct } from "@/lib/products";

export type CartItem = { slug: string; packId: string; quantity: number };

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  addItem: (slug: string, packId: string, quantity?: number) => void;
  updateQuantity: (slug: string, packId: string, quantity: number) => void;
  removeItem: (slug: string, packId: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "vantillu-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((item): item is CartItem => {
            if (!item || typeof item !== "object") return false;
            const value = item as Record<string, unknown>;
            const product = typeof value.slug === "string" ? getProduct(value.slug) : undefined;
            return Boolean(
              product &&
                product.availability !== "unavailable" &&
                typeof value.packId === "string" &&
                product.packSizes.some((pack) => pack.id === value.packId) &&
                Number.isInteger(value.quantity) &&
                Number(value.quantity) > 0,
            );
          });
          setItems(valid);
        }
      }
    } catch (error) {
      console.error("Unable to restore the saved cart.", error);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (error) {
        console.error("Unable to save the cart in this browser.", error);
      }
    }
  }, [hydrated, items]);

  function addItem(slug: string, packId: string, quantity = 1) {
    const product = getProduct(slug);
    if (
      !product ||
      product.availability === "unavailable" ||
      !product.packSizes.some((pack) => pack.id === packId) ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      throw new Error("This product or pack size cannot be added to the enquiry.");
    }
    setItems((current) => {
      const existing = current.find((item) => item.slug === slug && item.packId === packId);
      if (existing) {
        return current.map((item) =>
          item.slug === slug && item.packId === packId ? { ...item, quantity: item.quantity + quantity } : item,
        );
      }
      return [...current, { slug, packId, quantity }];
    });
  }

  function updateQuantity(slug: string, packId: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error("Quantity must be a positive whole number.");
    }
    setItems((current) =>
      current.map((item) =>
        item.slug === slug && item.packId === packId ? { ...item, quantity } : item,
      ),
    );
  }

  function removeItem(slug: string, packId: string) {
    setItems((current) => current.filter((item) => item.slug !== slug || item.packId !== packId));
  }

  const value = useMemo(() => {
    const count = items.reduce((total, item) => total + item.quantity, 0);
    const subtotal = items.reduce((total, item) => {
      const product = getProduct(item.slug);
      const pack = product?.packSizes.find((size) => size.id === item.packId);
      return total + (pack?.price ?? 0) * item.quantity;
    }, 0);
    return { items, hydrated, addItem, updateQuantity, removeItem, clear: () => setItems([]), count, subtotal };
  }, [items, hydrated]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider.");
  return context;
}

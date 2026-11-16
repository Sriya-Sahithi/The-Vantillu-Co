"use client";

import { useState } from "react";
import { useCart } from "@/components/cart-provider";

export function AddToCartButton({ slug, quantity = 1, disabled = false, label = "Add to cart" }: { slug: string; quantity?: number; disabled?: boolean; label?: string }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      className="button button-primary add-button"
      disabled={disabled}
      onClick={() => {
        addItem(slug, quantity);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1800);
      }}
      type="button"
    >
      {disabled ? "Currently unavailable" : added ? "Added to your cart" : label}
    </button>
  );
}

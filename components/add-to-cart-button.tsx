"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart-provider";

export function AddToCartButton({ slug, quantity = 1, disabled = false, label = "Add to cart", variant = "primary", goToCheckout = false, replace = false }: { slug: string; quantity?: number; disabled?: boolean; label?: string; variant?: "primary" | "outline"; goToCheckout?: boolean; replace?: boolean }) {
  const { addItem } = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);

  return (
    <button
      className={`button ${variant === "outline" ? "button-outline" : "button-primary"} add-button`}
      disabled={disabled}
      onClick={() => {
        addItem(slug, quantity, replace);
        if (goToCheckout) {
          router.push("/checkout");
          return;
        }
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1800);
      }}
      type="button"
    >
      {disabled ? "Currently unavailable" : added ? "Added to your cart" : label}
    </button>
  );
}

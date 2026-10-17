"use client";

import { useState } from "react";
import { useCart } from "@/components/cart-provider";

export function AddToCartButton({
  slug,
  packId,
  quantity = 1,
  disabled = false,
}: {
  slug: string;
  packId: string;
  quantity?: number;
  disabled?: boolean;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      className="button button-primary add-button"
      disabled={disabled}
      onClick={() => {
        addItem(slug, packId, quantity);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1800);
      }}
      type="button"
    >
      {disabled ? "Currently unavailable" : added ? "Added to your enquiry" : "Add to enquiry"}
    </button>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { ClientApiError, api } from "@/lib/client/api";
import type { Quote } from "@/lib/server/pricing";
import type { CartItem } from "@/components/cart-provider";

export type QuoteState = { quote: Quote | null; loading: boolean; error: string | null };

/** Fetches a trusted server quote whenever the cart (or PIN code) changes. */
export function useQuote(items: CartItem[], hydrated: boolean, pincode: string | null): QuoteState & { refresh: () => void } {
  const [state, setState] = useState<QuoteState>({ quote: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  const sequence = useRef(0);
  const signature = JSON.stringify(items);

  useEffect(() => {
    if (!hydrated) return;
    if (!items.length) {
      setState({ quote: null, loading: false, error: null });
      return;
    }
    const mine = ++sequence.current;
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));
    api<{ quote: Quote }>("/api/cart/quote", { body: { items, pincode }, signal: controller.signal })
      .then((data) => mine === sequence.current && setState({ quote: data.quote, loading: false, error: null }))
      .catch((error) => {
        if (controller.signal.aborted || mine !== sequence.current) return;
        setState({ quote: null, loading: false, error: error instanceof ClientApiError ? error.message : "Could not load prices." });
      });
    return () => controller.abort();
  }, [signature, hydrated, pincode, tick]);

  return { ...state, refresh: () => setTick((value) => value + 1) };
}

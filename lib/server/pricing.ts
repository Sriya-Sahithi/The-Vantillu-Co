import { MAX_LINE_QUANTITY, computeAvailability } from "@/lib/catalog-types";
import type { Queryable } from "@/lib/server/db";
import { checkServiceability, deliveryFeeFor, getDeliverySettings } from "@/lib/server/delivery";
import { ApiError } from "@/lib/server/http";
import { isValidPincode } from "@/lib/validation";

export type CartInput = { slug: string; quantity: number }[];

export type PricedLine = {
  productId: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  packLabel: string | null;
  packSizes: number[] | null;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
  /** Units currently in stock (informational for the UI). */
  stock: number;
};

export type CartIssue = { slug: string; name?: string; image?: string; code: "not_found" | "unavailable" | "no_price" | "out_of_stock" | "insufficient_stock" | "bad_quantity"; message: string; available?: number; packSizes?: number[] | null };

export type Quote = {
  lines: PricedLine[];
  issues: CartIssue[];
  subtotalPaise: number;
  deliveryFeePaise: number | null;
  totalPaise: number | null;
  delivery: { checked: boolean; serviceable: boolean | null; message: string | null; freeThresholdPaise: number | null; defaultFeePaise: number };
};

/** Merges duplicate slugs and validates shape/size. */
export function normalizeCart(raw: unknown): CartInput {
  if (!Array.isArray(raw) || raw.length === 0) throw new ApiError(400, "empty_cart", "Your cart is empty.");
  if (raw.length > 50) throw new ApiError(400, "bad_request", "Too many items in the cart.");
  const merged = new Map<string, number>();
  for (const entry of raw) {
    const slug = typeof entry?.slug === "string" ? entry.slug : "";
    const quantity = entry?.quantity;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || !Number.isInteger(quantity) || quantity < 1) {
      throw new ApiError(400, "bad_request", "Cart contains an invalid item.");
    }
    merged.set(slug, (merged.get(slug) ?? 0) + quantity);
  }
  return [...merged.entries()].map(([slug, quantity]) => ({ slug, quantity }));
}

/**
 * Builds a trusted quote from database prices. `lock` takes row locks on the products
 * (use it inside a transaction when reserving stock).
 */
export async function priceCart(q: Queryable, cart: CartInput, pincode?: string | null, options: { lock?: boolean } = {}): Promise<Quote> {
  const slugs = cart.map((c) => c.slug);
  const { rows } = await q.query(
    `select id, slug, name, description, image_url, pack_label, pack_sizes, price_paise, stock, is_available
     from products where slug = any($1) and archived_at is null ${options.lock ? "order by id for update" : ""}`,
    [slugs],
  );
  const bySlug = new Map(rows.map((r) => [r.slug as string, r]));

  const lines: PricedLine[] = [];
  const issues: CartIssue[] = [];
  for (const item of cart) {
    const row = bySlug.get(item.slug);
    if (!row) {
      issues.push({ slug: item.slug, code: "not_found", message: "This product is no longer available." });
      continue;
    }
    const availability = computeAvailability({ pricePaise: row.price_paise, isAvailable: row.is_available, stock: row.stock });
    if (availability === "enquiry") {
      issues.push({ slug: item.slug, name: row.name, image: row.image_url, code: "no_price", message: `${row.name} is not available for online ordering yet. Please enquire on WhatsApp.` });
      continue;
    }
    if (availability === "unavailable") {
      issues.push({ slug: item.slug, name: row.name, image: row.image_url, code: "unavailable", message: `${row.name} is currently unavailable.` });
      continue;
    }
    if (availability === "out_of_stock") {
      issues.push({ slug: item.slug, name: row.name, image: row.image_url, code: "out_of_stock", message: `${row.name} is out of stock.`, available: 0 });
      continue;
    }
    const packSizes: number[] | null = Array.isArray(row.pack_sizes) ? row.pack_sizes.map(Number) : null;
    if (packSizes) {
      if (!packSizes.includes(item.quantity)) {
        issues.push({ slug: item.slug, name: row.name, image: row.image_url, code: "bad_quantity", packSizes, message: `${row.name} is sold in packs of ${packSizes.join(", ")}. Please choose a pack size.` });
        continue;
      }
    } else if (item.quantity > MAX_LINE_QUANTITY) {
      issues.push({ slug: item.slug, name: row.name, image: row.image_url, code: "bad_quantity", message: `${row.name}: you can order up to ${MAX_LINE_QUANTITY} at a time.` });
      continue;
    }
    if (item.quantity > row.stock) {
      issues.push({ slug: item.slug, name: row.name, image: row.image_url, code: "insufficient_stock", message: `Only ${row.stock} of ${row.name} left.`, available: row.stock });
      continue;
    }
    lines.push({
      productId: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      image: row.image_url,
      packLabel: row.pack_label,
      packSizes,
      unitPricePaise: row.price_paise,
      quantity: item.quantity,
      lineTotalPaise: row.price_paise * item.quantity,
      stock: row.stock,
    });
  }

  const subtotalPaise = lines.reduce((total, line) => total + line.lineTotalPaise, 0);
  const settings = await getDeliverySettings(q);
  let deliveryFeePaise: number | null = null;
  let delivery: Quote["delivery"] = { checked: false, serviceable: null, message: null, freeThresholdPaise: settings.freeThresholdPaise, defaultFeePaise: settings.feePaise };

  if (pincode && isValidPincode(pincode)) {
    const area = await checkServiceability(q, settings, pincode);
    if (area.serviceable) {
      deliveryFeePaise = deliveryFeeFor(settings, area, subtotalPaise);
      delivery = { ...delivery, checked: true, serviceable: true, message: null };
    } else {
      delivery = {
        ...delivery,
        checked: true,
        serviceable: false,
        message:
          area.reason === "delivery_disabled"
            ? "Home delivery is temporarily paused. Please check back soon."
            : "Sorry, we do not deliver to this PIN code yet.",
      };
    }
  }

  return {
    lines,
    issues,
    subtotalPaise,
    deliveryFeePaise,
    totalPaise: deliveryFeePaise === null ? null : subtotalPaise + deliveryFeePaise,
    delivery,
  };
}

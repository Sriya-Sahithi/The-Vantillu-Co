export type Availability = "available" | "out_of_stock" | "unavailable" | "enquiry";

export type PublicProduct = {
  slug: string;
  name: string;
  category: string;
  categoryName: string;
  image: string;
  imageAlt: string;
  description: string;
  /** null = no online price yet (enquiry only). */
  pricePaise: number | null;
  packLabel: string | null;
  stock: number;
  availability: Availability;
  ingredients: string | null;
  allergens: string | null;
  netQuantity: string | null;
  shelfLife: string | null;
  storage: string | null;
};

export type PublicCategory = { id: string; name: string; description: string; image: string };

export const MAX_LINE_QUANTITY = 20;

export function isPurchasable(product: Pick<PublicProduct, "availability">): boolean {
  return product.availability === "available";
}

export function computeAvailability(input: { pricePaise: number | null; isAvailable: boolean; stock: number }): Availability {
  if (input.pricePaise === null) return "enquiry";
  if (!input.isAvailable) return "unavailable";
  if (input.stock <= 0) return "out_of_stock";
  return "available";
}

export type ProductCategory = "podis" | "spice-blends" | "chocolates" | "treats";

export type Product = {
  slug: string;
  name: string;
  category: ProductCategory;
  image: string;
  imageAlt: string;
  gallery?: { src: string; alt: string }[];
  description: string;
  packSizes: { id: string; label: string; price: number }[];
  availability: "unconfirmed" | "available" | "unavailable";
  ingredients?: string;
  allergens?: string;
  netQuantity?: string;
  shelfLife?: string;
  storage?: string;
  stock?: number;
  preparationEstimate?: string;
  dispatchEstimate?: string;
  labellingInformation?: string;
};

export const categories: { id: ProductCategory; name: string; description: string; image: string }[] = [
  {
    id: "podis",
    name: "Podi & Spice Blends",
    description: "The familiar warmth of a Telugu kitchen.",
    image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "spice-blends",
    name: "Cooking Essentials",
    description: "A little help for everyday cooking.",
    image: "https://images.unsplash.com/photo-1532336414038-cf19250c5757?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "chocolates",
    name: "Homemade Chocolates",
    description: "Small, thoughtful moments of sweetness.",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "treats",
    name: "Cookies & Treats",
    description: "Something lovely to share with your chai.",
    image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=900&q=85",
  },
];

const samplePack = [
  { id: "sample-small", label: "Small pack (sample)", price: 120 },
  { id: "sample-large", label: "Large pack (sample)", price: 220 },
];

const spiceReferenceImage = {
  src: "https://images.unsplash.com/photo-1532336414038-cf19250c5757?auto=format&fit=crop&w=1000&q=85",
  alt: "Lentils and spices on a natural surface; reference image",
};
const chocolateReferenceImage = {
  src: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&w=1000&q=85",
  alt: "Chocolate pieces on a plate; reference image",
};
const cookieReferenceImage = {
  src: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1000&q=85",
  alt: "Cookies arranged on a plate; reference image",
};

export const products: Product[] = [
  {
    slug: "karapodi",
    name: "Karapodi",
    category: "podis",
    image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Colourful spices arranged on a rustic surface; reference image",
    gallery: [spiceReferenceImage],
    description: "A traditional podi for the table. Product description and serving suggestions to be confirmed by the owner.",
    packSizes: samplePack,
    availability: "unconfirmed",
  },
  {
    slug: "kandipodi",
    name: "Kandipodi",
    category: "podis",
    image: "https://images.unsplash.com/photo-1532336414038-cf19250c5757?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Lentils and spices on a natural surface; reference image",
    gallery: [{ src: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1000&q=85", alt: "Colourful spices arranged on a rustic surface; reference image" }],
    description: "A familiar Telugu kitchen staple. Product description and serving suggestions to be confirmed by the owner.",
    packSizes: samplePack,
    availability: "unconfirmed",
  },
  {
    slug: "kura-karam",
    name: "Kura Karam",
    category: "spice-blends",
    image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Traditional spices in warm natural light; reference image",
    gallery: [spiceReferenceImage],
    description: "A spice blend for everyday cooking. Product details and suggested use to be confirmed by the owner.",
    packSizes: samplePack,
    availability: "unconfirmed",
  },
  {
    slug: "vepudu-karam",
    name: "Vepudu Karam",
    category: "spice-blends",
    image: "https://images.unsplash.com/photo-1532336414038-cf19250c5757?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Whole spices and lentils; reference image",
    gallery: [{ src: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1000&q=85", alt: "Traditional spices in warm natural light; reference image" }],
    description: "A traditional seasoning blend. Product details and suggested use to be confirmed by the owner.",
    packSizes: samplePack,
    availability: "unconfirmed",
  },
  {
    slug: "pulihora-mix",
    name: "Pulihora Mix",
    category: "spice-blends",
    image: "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "A home-style meal served on a banana leaf; reference image",
    gallery: [spiceReferenceImage],
    description: "A mix for a much-loved rice dish. Product details and preparation instructions to be confirmed by the owner.",
    packSizes: samplePack,
    availability: "unconfirmed",
  },
  {
    slug: "homemade-chocolates",
    name: "Homemade Chocolates",
    category: "chocolates",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Chocolate pieces arranged on a plate; reference image",
    gallery: [chocolateReferenceImage],
    description: "A little chocolate treat. Flavours, ingredients and allergen information to be confirmed by the owner.",
    packSizes: samplePack,
    availability: "unconfirmed",
  },
  {
    slug: "cookies",
    name: "Cookies",
    category: "treats",
    image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Cookies arranged on a baking tray; reference image",
    gallery: [cookieReferenceImage],
    description: "A treat to enjoy with a cup of chai. Flavours, ingredients and allergen information to be confirmed by the owner.",
    packSizes: samplePack,
    availability: "unconfirmed",
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

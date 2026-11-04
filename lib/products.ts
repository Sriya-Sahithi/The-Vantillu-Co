export type ProductCategory = "chocolates" | "podis" | "sweets" | "cookies";

export type Product = {
  slug: string;
  name: string;
  category: ProductCategory;
  image: string;
  imageAlt: string;
  gallery?: { src: string; alt: string }[];
  description: string;
  packSizes: { id: string; label: string; price?: number }[];
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

const enquirePack = [{ id: "enquire", label: "Pack size on enquiry" }];

const chocolateReferenceImage = {
  src: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&w=1000&q=85",
  alt: "Chocolate pieces on a plate; reference image",
};
const podiReferenceImage = {
  src: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1000&q=85",
  alt: "Warm spices arranged on a rustic surface; reference image",
};
const sweetReferenceImage = {
  src: "https://images.unsplash.com/photo-1599599810769-bcde5a160d25?auto=format&fit=crop&w=1000&q=85",
  alt: "Homemade round sweets on a plate; reference image",
};
const cookieReferenceImage = {
  src: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1000&q=85",
  alt: "Cookies arranged on a plate; reference image",
};

export const categories: { id: ProductCategory; name: string; description: string; image: string }[] = [
  {
    id: "chocolates",
    name: "Homemade Chocolates",
    description: "Dark, milk and white — made in small batches.",
    image: chocolateReferenceImage.src,
  },
  {
    id: "podis",
    name: "Homemade Podis",
    description: "Traditional kitchen staples, ground with care.",
    image: podiReferenceImage.src,
  },
  {
    id: "sweets",
    name: "Healthy Sweets",
    description: "Laddus made for sharing, not for a factory shelf.",
    image: sweetReferenceImage.src,
  },
  {
    id: "cookies",
    name: "Healthy Cookies",
    description: "Wholesome bakes for chai and little celebrations.",
    image: cookieReferenceImage.src,
  },
];

export const products: Product[] = [
  {
    slug: "dark-chocolate",
    name: "Dark Chocolate",
    category: "chocolates",
    image: chocolateReferenceImage.src,
    imageAlt: chocolateReferenceImage.alt,
    gallery: [chocolateReferenceImage],
    description: "Homemade dark chocolate from The Vantillu Co. Flavours, ingredients and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "milk-chocolate",
    name: "Milk Chocolate",
    category: "chocolates",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Milk chocolate squares; reference image",
    gallery: [chocolateReferenceImage],
    description: "Homemade milk chocolate from The Vantillu Co. Flavours, ingredients and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "white-chocolate",
    name: "White Chocolate",
    category: "chocolates",
    image: "https://images.unsplash.com/photo-1548907040-4baa42d10919?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "White chocolate pieces; reference image",
    gallery: [chocolateReferenceImage],
    description: "Homemade white chocolate from The Vantillu Co. Flavours, ingredients and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "kandi-podi",
    name: "Kandi Podi",
    category: "podis",
    image: podiReferenceImage.src,
    imageAlt: podiReferenceImage.alt,
    gallery: [podiReferenceImage],
    description: "Homemade Kandi Podi from The Vantillu Co. Ingredients, heat level and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "karivepaku-podi",
    name: "Karivepaku Podi",
    category: "podis",
    image: "https://images.unsplash.com/photo-1532336414038-cf19250c5757?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Lentils and spices on a natural surface; reference image",
    gallery: [podiReferenceImage],
    description: "Homemade Karivepaku Podi from The Vantillu Co. Ingredients and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "kura-karam",
    name: "Kura Karam",
    category: "podis",
    image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Traditional spices in warm natural light; reference image",
    gallery: [podiReferenceImage],
    description: "Homemade Kura Karam from The Vantillu Co. Ingredients and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "nuvvula-podi",
    name: "Nuvvula Podi",
    category: "podis",
    image: "https://images.unsplash.com/photo-1532336414038-cf19250c5757?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Whole spices and lentils; reference image",
    gallery: [podiReferenceImage],
    description: "Homemade Nuvvula Podi from The Vantillu Co. Ingredients and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "palli-podi",
    name: "Palli Podi",
    category: "podis",
    image: podiReferenceImage.src,
    imageAlt: podiReferenceImage.alt,
    gallery: [podiReferenceImage],
    description: "Homemade Palli Podi from The Vantillu Co. Ingredients and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "mixed-dry-fruit-laddu",
    name: "Mixed Dry Fruit Laddu",
    category: "sweets",
    image: sweetReferenceImage.src,
    imageAlt: sweetReferenceImage.alt,
    gallery: [sweetReferenceImage],
    description: "Homemade Mixed Dry Fruit Laddu from The Vantillu Co. Ingredients, allergens and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "peanut-laddu",
    name: "Peanut Laddu",
    category: "sweets",
    image: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Homemade sweet treats; reference image",
    gallery: [sweetReferenceImage],
    description: "Homemade Peanut Laddu from The Vantillu Co. Ingredients, allergens and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "cashew-laddu",
    name: "Cashew Laddu",
    category: "sweets",
    image: sweetReferenceImage.src,
    imageAlt: sweetReferenceImage.alt,
    gallery: [sweetReferenceImage],
    description: "Homemade Cashew Laddu from The Vantillu Co. Ingredients, allergens and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "oats-chocolate-chip-cookies",
    name: "Oats Chocolate Chip Cookies",
    category: "cookies",
    image: cookieReferenceImage.src,
    imageAlt: cookieReferenceImage.alt,
    gallery: [cookieReferenceImage],
    description: "Homemade Oats Chocolate Chip Cookies from The Vantillu Co. Ingredients, allergens and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "date-walnut-cookies",
    name: "Date & Walnut Cookies",
    category: "cookies",
    image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Cookies arranged on a baking tray; reference image",
    gallery: [cookieReferenceImage],
    description: "Homemade Date & Walnut Cookies from The Vantillu Co. Ingredients, allergens and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "almond-cookies",
    name: "Almond Cookies",
    category: "cookies",
    image: cookieReferenceImage.src,
    imageAlt: cookieReferenceImage.alt,
    gallery: [cookieReferenceImage],
    description: "Homemade Almond Cookies from The Vantillu Co. Ingredients, allergens and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function getCategoryName(id: ProductCategory): string {
  return categories.find((category) => category.id === id)?.name ?? id;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

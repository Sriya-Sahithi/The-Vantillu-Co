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

const chocolateImage = {
  src: "/images/chocolates.webp",
  alt: "Artisanal homemade chocolates handcrafted in small batches by The Vantillu Co.",
};
const podiImage = {
  src: "/images/podis.webp",
  alt: "Traditional freshly roasted and ground homemade Indian podis by The Vantillu Co.",
};
const sweetImage = {
  src: "/images/healthysweets.webp",
  alt: "Healthy traditional homemade Indian laddus made with dry fruits and nuts by The Vantillu Co.",
};
const cookieImage = {
  src: "/images/cookies.webp",
  alt: "Wholesome homemade healthy cookies baked fresh in small batches by The Vantillu Co.",
};

export const categories: { id: ProductCategory; name: string; description: string; image: string }[] = [
  {
    id: "chocolates",
    name: "Homemade Chocolates",
    description: "Dark, milk and white — handcrafted in small batches.",
    image: chocolateImage.src,
  },
  {
    id: "podis",
    name: "Homemade Podis",
    description: "Traditional kitchen staples, freshly ground with care.",
    image: podiImage.src,
  },
  {
    id: "sweets",
    name: "Healthy Sweets",
    description: "Laddus made with wholesome nuts, made for sharing.",
    image: sweetImage.src,
  },
  {
    id: "cookies",
    name: "Healthy Cookies",
    description: "Wholesome bakes for chai and mindful celebrations.",
    image: cookieImage.src,
  },
];

export const products: Product[] = [
  {
    slug: "dark-chocolate",
    name: "Dark Chocolate",
    category: "chocolates",
    image: chocolateImage.src,
    imageAlt: "Handcrafted Dark Chocolate by The Vantillu Co.",
    gallery: [chocolateImage],
    description: "Homemade dark chocolate from The Vantillu Co. Flavours, ingredients and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "milk-chocolate",
    name: "Milk Chocolate",
    category: "chocolates",
    image: chocolateImage.src,
    imageAlt: "Handcrafted Milk Chocolate by The Vantillu Co.",
    gallery: [chocolateImage],
    description: "Homemade milk chocolate from The Vantillu Co. Flavours, ingredients and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "white-chocolate",
    name: "White Chocolate",
    category: "chocolates",
    image: chocolateImage.src,
    imageAlt: "Handcrafted White Chocolate by The Vantillu Co.",
    gallery: [chocolateImage],
    description: "Homemade white chocolate from The Vantillu Co. Flavours, ingredients and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "kandi-podi",
    name: "Kandi Podi",
    category: "podis",
    image: podiImage.src,
    imageAlt: "Traditional Homemade Kandi Podi by The Vantillu Co.",
    gallery: [podiImage],
    description: "Homemade Kandi Podi from The Vantillu Co. Ingredients, heat level and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "karivepaku-podi",
    name: "Karivepaku Podi",
    category: "podis",
    image: podiImage.src,
    imageAlt: "Traditional Homemade Karivepaku Podi by The Vantillu Co.",
    gallery: [podiImage],
    description: "Homemade Karivepaku Podi from The Vantillu Co. Ingredients and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "kura-karam",
    name: "Kura Karam",
    category: "podis",
    image: podiImage.src,
    imageAlt: "Traditional Homemade Kura Karam by The Vantillu Co.",
    gallery: [podiImage],
    description: "Homemade Kura Karam from The Vantillu Co. Ingredients and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "nuvvula-podi",
    name: "Nuvvula Podi",
    category: "podis",
    image: podiImage.src,
    imageAlt: "Traditional Homemade Nuvvula Podi by The Vantillu Co.",
    gallery: [podiImage],
    description: "Homemade Nuvvula Podi from The Vantillu Co. Ingredients and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "palli-podi",
    name: "Palli Podi",
    category: "podis",
    image: podiImage.src,
    imageAlt: "Traditional Homemade Palli Podi by The Vantillu Co.",
    gallery: [podiImage],
    description: "Homemade Palli Podi from The Vantillu Co. Ingredients and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "mixed-dry-fruit-laddu",
    name: "Mixed Dry Fruit Laddu",
    category: "sweets",
    image: sweetImage.src,
    imageAlt: "Healthy Homemade Mixed Dry Fruit Laddu by The Vantillu Co.",
    gallery: [sweetImage],
    description: "Homemade Mixed Dry Fruit Laddu from The Vantillu Co. Ingredients, allergens and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "peanut-laddu",
    name: "Peanut Laddu",
    category: "sweets",
    image: sweetImage.src,
    imageAlt: "Healthy Homemade Peanut Laddu by The Vantillu Co.",
    gallery: [sweetImage],
    description: "Homemade Peanut Laddu from The Vantillu Co. Ingredients, allergens and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "cashew-laddu",
    name: "Cashew Laddu",
    category: "sweets",
    image: sweetImage.src,
    imageAlt: "Healthy Homemade Cashew Laddu by The Vantillu Co.",
    gallery: [sweetImage],
    description: "Homemade Cashew Laddu from The Vantillu Co. Ingredients, allergens and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "oats-chocolate-chip-cookies",
    name: "Oats Chocolate Chip Cookies",
    category: "cookies",
    image: cookieImage.src,
    imageAlt: "Homemade Oats Chocolate Chip Cookies by The Vantillu Co.",
    gallery: [cookieImage],
    description: "Homemade Oats Chocolate Chip Cookies from The Vantillu Co. Ingredients, allergens and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "date-walnut-cookies",
    name: "Date & Walnut Cookies",
    category: "cookies",
    image: cookieImage.src,
    imageAlt: "Homemade Date & Walnut Cookies by The Vantillu Co.",
    gallery: [cookieImage],
    description: "Homemade Date & Walnut Cookies from The Vantillu Co. Ingredients, allergens and pack sizes will be confirmed when you enquire.",
    packSizes: enquirePack,
    availability: "unconfirmed",
  },
  {
    slug: "almond-cookies",
    name: "Almond Cookies",
    category: "cookies",
    image: cookieImage.src,
    imageAlt: "Homemade Almond Cookies by The Vantillu Co.",
    gallery: [cookieImage],
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

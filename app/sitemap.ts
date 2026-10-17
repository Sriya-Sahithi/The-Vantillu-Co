import type { MetadataRoute } from "next";
import { products } from "@/lib/products";
import { siteConfig } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/shop", "/story", "/contact", "/policies/shipping", "/policies/returns", "/policies/privacy", "/policies/terms"];
  return [
    ...pages.map((path) => ({ url: `${siteConfig.siteUrl}${path}`, lastModified: new Date() })),
    ...products.map((product) => ({ url: `${siteConfig.siteUrl}/product/${product.slug}`, lastModified: new Date() })),
  ];
}

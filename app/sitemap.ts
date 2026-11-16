import type { MetadataRoute } from "next";
import { listProducts } from "@/lib/server/catalog";
import { siteConfig } from "@/lib/site-config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await listProducts();
  const pages = ["", "/shop", "/story", "/contact", "/track", "/policies/shipping", "/policies/returns", "/policies/privacy", "/policies/terms"];
  return [
    ...pages.map((path) => ({ url: `${siteConfig.siteUrl}${path}`, lastModified: new Date() })),
    ...products.map((product) => ({ url: `${siteConfig.siteUrl}/product/${product.slug}`, lastModified: new Date() })),
  ];
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Search, SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { categories, products, type ProductCategory } from "@/lib/products";

export function ShopCatalogue() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [sort, setSort] = useState("featured");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialCategory = params.get("category");
    if (categories.some((item) => item.id === initialCategory)) setCategory(initialCategory as ProductCategory);
    if (params.get("focus") === "search") document.getElementById("product-search")?.focus();
  }, []);

  const shownProducts = useMemo(() => {
    const matching = products.filter((product) => {
      const matchesCategory = category === "all" || product.category === category;
      const matchesQuery = `${product.name} ${product.description}`.toLowerCase().includes(query.trim().toLowerCase());
      return matchesCategory && matchesQuery;
    });
    if (sort === "name") return [...matching].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "price-low") return [...matching].sort((a, b) => a.packSizes[0].price - b.packSizes[0].price);
    if (sort === "price-high") return [...matching].sort((a, b) => b.packSizes[0].price - a.packSizes[0].price);
    return matching;
  }, [category, query, sort]);

  return (
    <>
      <div className="shop-controls">
        <label className="search-field" htmlFor="product-search">
          <Search size={18} />
          <input aria-label="Search our collection" id="product-search" onChange={(event) => setQuery(event.target.value)} placeholder="Search our collection" type="search" value={query} />
        </label>
        <label className="sort-field" htmlFor="product-sort">
          <SlidersHorizontal size={17} />
          <span className="sr-only">Sort products</span>
          <select id="product-sort" onChange={(event) => setSort(event.target.value)} value={sort}>
            <option value="featured">Featured</option>
            <option value="name">Name: A to Z</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </label>
      </div>
      <div aria-label="Filter products by category" className="filter-list" role="group">
        <button aria-pressed={category === "all"} className={category === "all" ? "filter-chip active" : "filter-chip"} onClick={() => setCategory("all")} type="button">Everything</button>
        {categories.map((item) => (
          <button aria-pressed={category === item.id} className={category === item.id ? "filter-chip active" : "filter-chip"} key={item.id} onClick={() => setCategory(item.id)} type="button">{item.name}</button>
        ))}
      </div>
      <p className="product-result-count">{shownProducts.length} {shownProducts.length === 1 ? "little something" : "little somethings"}</p>
      {shownProducts.length ? (
        <div className="product-grid shop-product-grid">
          {shownProducts.map((product) => <ProductCard key={product.slug} product={product} />)}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-image"><Image alt="" fill sizes="100vw" src={categories[0].image} /></div>
          <h2>Nothing on the shelf just yet.</h2>
          <p>Try another search or browse everything in our collection.</p>
          <button className="button button-primary" onClick={() => { setQuery(""); setCategory("all"); }} type="button">Show everything</button>
        </div>
      )}
    </>
  );
}

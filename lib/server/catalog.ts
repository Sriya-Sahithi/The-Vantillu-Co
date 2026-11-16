import { products as staticProducts, categories as staticCategories, getCategoryName } from "@/lib/products";
import { computeAvailability, type PublicCategory, type PublicProduct } from "@/lib/catalog-types";
import { getDb, hasDatabase, type Queryable, type Row } from "@/lib/server/db";

export function mapProduct(row: Row): PublicProduct {
  const pricePaise = row.price_paise === null ? null : Number(row.price_paise);
  return {
    slug: row.slug,
    name: row.name,
    category: row.category_id,
    categoryName: row.category_name,
    image: row.image_url,
    imageAlt: row.image_alt || row.name,
    description: row.description,
    pricePaise,
    packLabel: row.pack_label,
    stock: row.stock,
    availability: computeAvailability({ pricePaise, isAvailable: row.is_available, stock: row.stock }),
    ingredients: row.ingredients,
    allergens: row.allergens,
    netQuantity: row.net_quantity,
    shelfLife: row.shelf_life,
    storage: row.storage,
  };
}

const SELECT = `select p.*, c.name as category_name from products p join categories c on c.id = p.category_id`;

/** Static fallback used only when no database is configured (e.g. a fresh clone): enquiry-only, as before. */
function staticCatalogue(): PublicProduct[] {
  return staticProducts.map((p) => ({
    slug: p.slug,
    name: p.name,
    category: p.category,
    categoryName: getCategoryName(p.category),
    image: p.image,
    imageAlt: p.imageAlt,
    description: p.description,
    pricePaise: null,
    packLabel: null,
    stock: 0,
    availability: "enquiry" as const,
    ingredients: p.ingredients ?? null,
    allergens: p.allergens ?? null,
    netQuantity: p.netQuantity ?? null,
    shelfLife: p.shelfLife ?? null,
    storage: p.storage ?? null,
  }));
}

/** If the database is unreachable the public catalogue degrades to enquiry-only instead of erroring. */
async function withFallback<T>(run: () => Promise<T>, fallback: () => T): Promise<T> {
  if (!hasDatabase()) return fallback();
  try {
    return await run();
  } catch (error) {
    console.error("Catalogue query failed; serving the static enquiry-only catalogue", { message: error instanceof Error ? error.message : "unknown" });
    return fallback();
  }
}

export function listProducts(q?: Queryable): Promise<PublicProduct[]> {
  return withFallback(
    async () => (await (q ?? getDb()).query(`${SELECT} where p.archived_at is null order by p.sort_order, p.name`)).rows.map(mapProduct),
    staticCatalogue,
  );
}

export function findProduct(slug: string): Promise<PublicProduct | null> {
  return withFallback(
    async () => {
      const { rows } = await getDb().query(`${SELECT} where p.slug = $1 and p.archived_at is null`, [slug]);
      return rows[0] ? mapProduct(rows[0]) : null;
    },
    () => staticCatalogue().find((p) => p.slug === slug) ?? null,
  );
}

const staticCategoryList = (): PublicCategory[] => staticCategories.map((c) => ({ id: c.id, name: c.name, description: c.description, image: c.image }));

export function listCategories(): Promise<PublicCategory[]> {
  return withFallback(
    async () => (await getDb().query(`select * from categories order by sort_order`)).rows.map((r) => ({ id: r.id, name: r.name, description: r.description, image: r.image_url })),
    staticCategoryList,
  );
}

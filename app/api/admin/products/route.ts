import { adminCreateProduct, adminListProducts } from "@/lib/server/admin";
import { requireAdmin } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { readJson, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin(req);
  const { rows } = await getDb().query(`select id, name from categories order by sort_order`);
  return { products: await adminListProducts(), categories: rows };
});

export const POST = route(async (req) => {
  const admin = await requireAdmin(req);
  return { product: await adminCreateProduct(admin.id, await readJson(req)) };
});

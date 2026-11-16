import { requireUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { route } from "@/lib/server/http";
import { orderAccessToken } from "@/lib/server/order-access";
import { serializeOrder } from "@/lib/server/orders";

export const dynamic = "force-dynamic";

/** Only the signed-in customer's own orders (user_id = session user). */
export const GET = route(async (req) => {
  const user = await requireUser(req);
  const db = getDb();
  const { rows } = await db.query(`select * from orders where user_id = $1 order by created_at desc limit 100`, [user.id]);
  const orders = await Promise.all(rows.map(async (o) => ({ ...(await serializeOrder(db, o)), accessToken: orderAccessToken(o.id) })));
  return { orders };
});

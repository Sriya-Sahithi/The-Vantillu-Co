import { getDb } from "@/lib/server/db";
import { ApiError, clientIp, readJson, route, str } from "@/lib/server/http";
import { orderAccessToken } from "@/lib/server/order-access";
import { rateLimit } from "@/lib/server/rate-limit";
import { normalizeMobile } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Guest lookup: order number AND the mobile number used at checkout. Heavily rate-limited. */
export const POST = route(async (req) => {
  const db = getDb();
  await rateLimit(db, `lookup:${clientIp(req)}`, 10, 900);
  const body = await readJson(req);
  const orderNumber = str(body.orderNumber, 20).toUpperCase();
  const mobile = normalizeMobile(body.mobile);
  await rateLimit(db, `lookup-order:${orderNumber}`, 10, 3600);
  const { rows } = await db.query(`select id, order_number from orders where order_number = $1 and mobile = $2`, [orderNumber, mobile ?? "-"]);
  if (!rows[0]) throw new ApiError(404, "not_found", "We could not find an order with those details.");
  return { orderNumber: rows[0].order_number, token: orderAccessToken(rows[0].id) };
});

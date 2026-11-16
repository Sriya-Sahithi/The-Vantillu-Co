import { requireUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { clientIp, readJson, route, str } from "@/lib/server/http";
import { loadAuthorizedOrder } from "@/lib/server/orders";
import { rateLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

/** Links a guest order to the signed-in account (proof = the order's access token). */
export const POST = route<{ params: Promise<{ orderNumber: string }> }>(async (req, ctx) => {
  const user = await requireUser(req);
  await rateLimit(getDb(), `claim:${clientIp(req)}`, 20, 600);
  const { orderNumber } = await ctx.params;
  const body = await readJson(req);
  const order = await loadAuthorizedOrder(getDb(), orderNumber.toUpperCase(), str(body.token, 100) || null, { userId: null, isAdmin: false });
  if (order.user_id && order.user_id !== user.id) return { claimed: false };
  await getDb().query(`update orders set user_id = $2 where id = $1 and (user_id is null or user_id = $2)`, [order.id, user.id]);
  return { claimed: true };
});

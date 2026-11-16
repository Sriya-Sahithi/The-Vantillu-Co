import { getUserFromRequest } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { clientIp, readJson, route, str } from "@/lib/server/http";
import { loadAuthorizedOrder, prepareRetry } from "@/lib/server/orders";
import { rateLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  await rateLimit(getDb(), `retry:${clientIp(req)}`, 20, 600);
  const body = await readJson(req);
  const user = await getUserFromRequest(req);
  const order = await loadAuthorizedOrder(getDb(), str(body.orderNumber, 20), str(body.token, 100) || null, { userId: user?.id ?? null, isAdmin: false });
  return { session: await prepareRetry(order.order_number) };
});

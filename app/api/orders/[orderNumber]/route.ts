import { getUserFromRequest } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { clientIp, route } from "@/lib/server/http";
import { loadOrderView } from "@/lib/server/orders";
import { rateLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

/** Order details: requires the owner's session, an admin session, or the unguessable access token (?t=). */
export const GET = route<{ params: Promise<{ orderNumber: string }> }>(async (req, ctx) => {
  await rateLimit(getDb(), `order-view:${clientIp(req)}`, 120, 600);
  const { orderNumber } = await ctx.params;
  const user = await getUserFromRequest(req);
  const order = await loadOrderView(orderNumber.toUpperCase(), req.nextUrl.searchParams.get("t"), { userId: user?.id ?? null, isAdmin: Boolean(user?.isAdmin) }, { reconcile: true });
  return { order };
});

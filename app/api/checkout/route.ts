import { getUserFromRequest } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { clientIp, readJson, route } from "@/lib/server/http";
import { createOrder } from "@/lib/server/orders";
import { rateLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  await rateLimit(getDb(), `checkout:${clientIp(req)}`, 20, 600);
  const body = await readJson(req);
  const user = await getUserFromRequest(req);
  const session = await createOrder({
    cart: body.items,
    fields: (body.fields ?? {}) as Record<string, unknown>,
    idempotencyKey: body.idempotencyKey,
    userId: user?.id ?? null,
  });
  return { session };
});

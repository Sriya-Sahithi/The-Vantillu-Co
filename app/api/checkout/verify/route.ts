import { getUserFromRequest } from "@/lib/server/auth";
import { verifyCheckoutCallback } from "@/lib/server/checkout-verify";
import { getDb } from "@/lib/server/db";
import { clientIp, readJson, route, str } from "@/lib/server/http";
import { loadAuthorizedOrder } from "@/lib/server/orders";
import { rateLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Called by the browser after Razorpay Checkout reports success. The result of this call is NOT
 * trusted blindly: signature is verified, then the payment is re-read from Razorpay's API.
 */
export const POST = route(async (req) => {
  await rateLimit(getDb(), `verify:${clientIp(req)}`, 30, 600);
  const body = await readJson(req);
  const user = await getUserFromRequest(req);
  const order = await loadAuthorizedOrder(getDb(), str(body.orderNumber, 20), str(body.token, 100) || null, { userId: user?.id ?? null, isAdmin: false });
  const outcome = await verifyCheckoutCallback(order, body.paymentId, body.signature);
  return { outcome };
});

import { getDb } from "@/lib/server/db";
import { str, readJson, route } from "@/lib/server/http";
import { normalizeCart, priceCart } from "@/lib/server/pricing";
import { isValidPincode } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Trusted price/stock quote for the cart. The browser only ever displays what this returns. */
export const POST = route(async (req) => {
  const body = await readJson(req);
  const cart = normalizeCart(body.items);
  const pincode = str(body.pincode, 6);
  const quote = await priceCart(getDb(), cart, isValidPincode(pincode) ? pincode : null);
  return { quote };
});

import { hmacHex, safeEqual } from "@/lib/server/crypto";
import { sessionSecret } from "@/lib/server/env";

/**
 * Unguessable capability token for guest order access: HMAC(secret, order id).
 * Deterministic so a retried (idempotent) checkout can hand the same link back.
 */
export function orderAccessToken(orderId: string): string {
  return hmacHex(sessionSecret(), `order-access:${orderId}`);
}

export function isValidOrderToken(orderId: string, token: unknown): boolean {
  return typeof token === "string" && token.length === 64 && safeEqual(orderAccessToken(orderId), token);
}

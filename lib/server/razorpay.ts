import { hmacHex, safeEqual } from "@/lib/server/crypto";
import { env, requireEnv } from "@/lib/server/env";
import { ApiError } from "@/lib/server/http";

/**
 * API base. RAZORPAY_API_BASE exists only so automated local tests can point at a mock gateway; it is
 * ignored in production builds so a stray variable can never redirect real payment traffic.
 */
const API = (!env.isProduction && process.env.RAZORPAY_API_BASE) || "https://api.razorpay.com/v1";

export function razorpayConfigured(): boolean {
  return Boolean(env.razorpayKeyId && env.razorpayKeySecret);
}

/** Test keys start with rzp_test_. Surfaced in the UI so nobody mistakes a test checkout for live. */
export function razorpayMode(): "test" | "live" | null {
  const id = env.razorpayKeyId;
  if (!id) return null;
  return id.startsWith("rzp_live_") ? "live" : "test";
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const auth = Buffer.from(`${requireEnv("RAZORPAY_KEY_ID")}:${requireEnv("RAZORPAY_KEY_SECRET")}`).toString("base64");
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    console.error("Razorpay request failed", { path, message: error instanceof Error ? error.message : "unknown" });
    throw new ApiError(502, "gateway_unreachable", "The payment service is not reachable right now. Please try again.");
  }
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const err = (data.error ?? {}) as { code?: string; description?: string };
    console.error("Razorpay API error", { path, status: response.status, code: err.code });
    throw new ApiError(response.status === 400 ? 400 : 502, "gateway_error", "The payment service could not process this request.");
  }
  return data as T;
}

export type RzpOrder = { id: string; amount: number; currency: string; status: string; receipt?: string };
export type RzpPayment = {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method?: string;
  error_code?: string | null;
  error_description?: string | null;
  amount_refunded?: number;
};
export type RzpRefund = { id: string; payment_id: string; amount: number; status: "pending" | "processed" | "failed" };

export const createGatewayOrder = (amountPaise: number, receipt: string, notes: Record<string, string>) =>
  call<RzpOrder>("POST", "/orders", { amount: amountPaise, currency: "INR", receipt, notes });
export const fetchGatewayPayment = (paymentId: string) => call<RzpPayment>("GET", `/payments/${encodeURIComponent(paymentId)}`);
export const fetchGatewayOrderPayments = (orderId: string) =>
  call<{ items: RzpPayment[] }>("GET", `/orders/${encodeURIComponent(orderId)}/payments`);
export const captureGatewayPayment = (paymentId: string, amountPaise: number) =>
  call<RzpPayment>("POST", `/payments/${encodeURIComponent(paymentId)}/capture`, { amount: amountPaise, currency: "INR" });
export const createGatewayRefund = (paymentId: string, amountPaise: number, receipt: string) =>
  call<RzpRefund>("POST", `/payments/${encodeURIComponent(paymentId)}/refund`, { amount: amountPaise, speed: "normal", receipt });
export const fetchGatewayRefund = (refundId: string) => call<RzpRefund>("GET", `/refunds/${encodeURIComponent(refundId)}`);

/** Checkout signature: HMAC_SHA256(order_id|payment_id) keyed with the API key secret. */
export function verifyCheckoutSignature(razorpayOrderId: string, paymentId: string, signature: string): boolean {
  const secret = env.razorpayKeySecret;
  if (!secret || typeof signature !== "string" || !/^[0-9a-f]{64}$/.test(signature)) return false;
  return safeEqual(hmacHex(secret, `${razorpayOrderId}|${paymentId}`), signature);
}

/** Webhook signature: HMAC_SHA256(raw body) keyed with the webhook secret. Must receive the raw, unparsed body. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = env.razorpayWebhookSecret;
  if (!secret || !signature || !/^[0-9a-f]{64}$/.test(signature)) return false;
  return safeEqual(hmacHex(secret, rawBody), signature);
}

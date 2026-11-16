import { getDb, type Row } from "@/lib/server/db";
import { ApiError } from "@/lib/server/http";
import { audit } from "@/lib/server/order-core";
import { reconcileGatewayPayment, type PaymentOutcome } from "@/lib/server/payments";
import { verifyCheckoutSignature } from "@/lib/server/razorpay";

/**
 * Handles the browser's "payment completed" callback. The callback itself proves nothing: the HMAC
 * signature is checked, and then the payment is read back from Razorpay's API before anything changes.
 */
export async function verifyCheckoutCallback(order: Row, paymentId: unknown, signature: unknown): Promise<PaymentOutcome> {
  if (!order.razorpay_order_id || typeof paymentId !== "string" || !/^pay_[A-Za-z0-9]{6,40}$/.test(paymentId) || typeof signature !== "string") {
    throw new ApiError(400, "bad_request", "Invalid payment details.");
  }
  if (!verifyCheckoutSignature(order.razorpay_order_id, paymentId, signature)) {
    await audit(getDb(), null, "payment.invalid_signature", "order", order.id, { paymentId });
    throw new ApiError(400, "invalid_signature", "We could not verify this payment. If money was debited it will be reconciled automatically or refunded.");
  }
  return reconcileGatewayPayment(order.razorpay_order_id, paymentId, "checkout", true);
}

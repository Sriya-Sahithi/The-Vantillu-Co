import { getDb, type Queryable, type Row } from "@/lib/server/db";
import { audit, lockOrder, reserveStock, setStatus } from "@/lib/server/order-core";
import { flushOutbox, notifyOrder } from "@/lib/server/notifications";
import {
  captureGatewayPayment,
  createGatewayRefund,
  fetchGatewayOrderPayments,
  fetchGatewayPayment,
  razorpayConfigured,
  type RzpPayment,
} from "@/lib/server/razorpay";

export type PaymentOutcome = "paid" | "already_paid" | "failed" | "pending" | "mismatch" | "late_refunded" | "unknown_order";

async function upsertPayment(q: Queryable, order: Row, payment: { id: string; status: string; amount: number; method?: string; errorCode?: string | null; errorDescription?: string | null }, signatureVerified: boolean, raw: unknown) {
  // Never regress a captured/refunded payment to a weaker status.
  await q.query(
    `insert into payments (order_id, razorpay_order_id, razorpay_payment_id, status, amount_paise, method, failure_code, failure_reason, signature_verified, raw)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     on conflict (razorpay_payment_id) do update set
       status = case when payments.status in ('captured','refunded') and excluded.status in ('created','authorized','failed') then payments.status else excluded.status end,
       method = coalesce(excluded.method, payments.method),
       failure_code = excluded.failure_code,
       failure_reason = excluded.failure_reason,
       signature_verified = payments.signature_verified or excluded.signature_verified,
       raw = excluded.raw,
       updated_at = now()`,
    [order.id, order.razorpay_order_id, payment.id, payment.status, payment.amount, payment.method ?? null, payment.errorCode ?? null, payment.errorDescription ?? null, signatureVerified, JSON.stringify(raw ?? null)],
  );
}

/**
 * The single, idempotent path that can mark an order paid. Callers: verified checkout callback,
 * verified webhook, reconciliation. `payment` must come from the gateway API or a verified webhook.
 */
export async function applyCapturedPayment(razorpayOrderId: string, payment: RzpPayment, source: "checkout" | "webhook" | "reconcile", signatureVerified = false): Promise<PaymentOutcome> {
  let queuedForFlush = false;
  const outcome = await getDb().tx(async (q) => {
    const order = await lockOrder(q, "razorpay_order_id", razorpayOrderId);
    if (!order) return "unknown_order" as const;

    if (payment.order_id && payment.order_id !== razorpayOrderId) {
      await audit(q, null, "payment.order_mismatch", "order", order.id, { paymentId: payment.id, source });
      return "mismatch" as const;
    }
    if (payment.amount !== order.total_paise || payment.currency !== "INR") {
      await upsertPayment(q, order, { id: payment.id, status: "authorized", amount: payment.amount, method: payment.method, errorDescription: "Amount does not match the order; needs manual review" }, signatureVerified, payment);
      await audit(q, null, "payment.amount_mismatch", "order", order.id, { paymentId: payment.id, expected: order.total_paise, got: payment.amount, source });
      return "mismatch" as const;
    }
    await upsertPayment(q, order, { id: payment.id, status: "captured", amount: payment.amount, method: payment.method }, signatureVerified, payment);

    if (["paid", "confirmed", "preparing", "dispatched", "delivered", "refund_initiated", "refunded"].includes(order.status)) {
      return "already_paid" as const;
    }
    if (order.status === "cancelled") {
      // Money arrived after the order was cancelled/expired. Try to honour it, otherwise refund automatically.
      if (await reserveStock(q, order)) {
        await setStatus(q, order, "paid", { type: "gateway" }, `Late payment ${payment.id} accepted`, { paid_at: new Date(), cancel_reason: null });
        await notifyOrder(q, order.id, "payment_success");
        queuedForFlush = true;
        return "paid" as const;
      }
      await setStatus(q, order, "refund_initiated", { type: "gateway" }, "Payment arrived after cancellation and stock was unavailable; automatic refund");
      const { rows } = await q.query(`select id from payments where razorpay_payment_id = $1`, [payment.id]);
      await q.query(`insert into refunds (order_id, payment_id, amount_paise, status, reason) values ($1, $2, $3, 'initiated', 'Automatic: late payment on cancelled order')`, [order.id, rows[0].id, payment.amount]);
      await notifyOrder(q, order.id, "refund_initiated");
      queuedForFlush = true;
      return "late_refunded" as const;
    }
    await setStatus(q, order, "paid", { type: "gateway" }, `Payment ${payment.id} verified via ${source}`, { paid_at: new Date() });
    await notifyOrder(q, order.id, "payment_success");
    queuedForFlush = true;
    return "paid" as const;
  });

  if (outcome === "late_refunded") await submitPendingRefunds(razorpayOrderId);
  if (queuedForFlush) await flushOutbox().catch(() => undefined);
  return outcome;
}

export async function applyFailedPayment(razorpayOrderId: string, payment: RzpPayment): Promise<PaymentOutcome> {
  const outcome = await getDb().tx(async (q) => {
    const order = await lockOrder(q, "razorpay_order_id", razorpayOrderId);
    if (!order) return "unknown_order" as const;
    await upsertPayment(q, order, { id: payment.id, status: "failed", amount: payment.amount, method: payment.method, errorCode: payment.error_code, errorDescription: payment.error_description }, false, payment);
    // A failure never downgrades an order that is already paid (e.g. a second attempt failed after the first succeeded).
    if (order.status !== "payment_pending") return order.status === "payment_failed" ? ("failed" as const) : ("already_paid" as const);
    await setStatus(q, order, "payment_failed", { type: "gateway" }, payment.error_description ?? "Payment failed");
    await notifyOrder(q, order.id, "payment_failed", payment.id);
    return "failed" as const;
  });
  await flushOutbox().catch(() => undefined);
  return outcome;
}

/** Looks at the gateway's own record for a payment and applies the right transition. */
export async function reconcileGatewayPayment(razorpayOrderId: string, paymentId: string, source: "checkout" | "webhook" | "reconcile", signatureVerified = false): Promise<PaymentOutcome> {
  let payment = await fetchGatewayPayment(paymentId);
  if (payment.status === "authorized") {
    try {
      payment = await captureGatewayPayment(payment.id, payment.amount);
    } catch {
      payment = await fetchGatewayPayment(paymentId); // may have been captured concurrently
    }
  }
  if (payment.status === "captured" || (payment.status === "refunded" && (payment.amount_refunded ?? 0) === 0)) {
    return applyCapturedPayment(razorpayOrderId, payment.status === "refunded" ? { ...payment, status: "captured" } : payment, source, signatureVerified);
  }
  if (payment.status === "failed") return applyFailedPayment(razorpayOrderId, payment);
  return "pending";
}

/** Pulls every payment for an order from the gateway; used for stuck-pending orders and delayed webhooks. */
export async function reconcileOrder(razorpayOrderId: string): Promise<PaymentOutcome> {
  if (!razorpayConfigured()) return "pending";
  const { items } = await fetchGatewayOrderPayments(razorpayOrderId);
  const captured = items.find((p) => p.status === "captured" || p.status === "authorized");
  if (captured) return reconcileGatewayPayment(razorpayOrderId, captured.id, "reconcile");
  const failed = items.find((p) => p.status === "failed");
  if (failed) return applyFailedPayment(razorpayOrderId, failed);
  return "pending";
}

/** Sends any refund rows that have no gateway id yet to Razorpay. */
export async function submitPendingRefunds(razorpayOrderId?: string) {
  const db = getDb();
  const { rows } = await db.query(
    `select r.id, r.amount_paise, p.razorpay_payment_id, r.order_id from refunds r
     join payments p on p.id = r.payment_id join orders o on o.id = r.order_id
     where r.razorpay_refund_id is null and r.status = 'initiated' and p.razorpay_payment_id is not null
       and ($1::text is null or o.razorpay_order_id = $1)`,
    [razorpayOrderId ?? null],
  );
  for (const row of rows) {
    try {
      const refund = await createGatewayRefund(row.razorpay_payment_id, row.amount_paise, `refund-${String(row.id).slice(0, 30)}`);
      await db.query(`update refunds set razorpay_refund_id = $2, updated_at = now() where id = $1`, [row.id, refund.id]);
    } catch (error) {
      await db.query(`update refunds set status = 'failed', updated_at = now() where id = $1`, [row.id]);
      await audit(db, null, "refund.submit_failed", "order", row.order_id, { message: error instanceof Error ? error.message : "unknown" });
    }
  }
}

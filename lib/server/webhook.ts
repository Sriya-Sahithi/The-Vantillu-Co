import { createHash } from "node:crypto";
import { getDb, type Row } from "@/lib/server/db";
import { audit, lockOrder, setStatus } from "@/lib/server/order-core";
import { notifyOrder, flushOutbox } from "@/lib/server/notifications";
import { applyCapturedPayment, applyFailedPayment, reconcileGatewayPayment } from "@/lib/server/payments";
import type { RzpPayment } from "@/lib/server/razorpay";

type WebhookPayload = {
  event?: string;
  payload?: { payment?: { entity?: RzpPayment }; refund?: { entity?: { id: string; payment_id: string; amount: number; status: string } }; order?: { entity?: { id: string } } };
};

/**
 * Idempotent webhook processing. The caller MUST have verified the signature over the raw body.
 * Returns "duplicate" when the same event was already fully processed.
 */
export async function processWebhook(rawBody: string, eventIdHeader: string | null): Promise<"processed" | "duplicate" | "ignored"> {
  const body = JSON.parse(rawBody) as WebhookPayload;
  const eventId = eventIdHeader || `body:${createHash("sha256").update(rawBody).digest("hex")}`;
  const db = getDb();

  const inserted = await db.query(
    `insert into webhook_events (event_id, event, payload) values ($1, $2, $3) on conflict (event_id) do nothing returning event_id`,
    [eventId, body.event ?? "unknown", rawBody],
  );
  if (!inserted.rowCount) {
    const { rows } = await db.query(`select processed_at from webhook_events where event_id = $1`, [eventId]);
    if (rows[0]?.processed_at) return "duplicate";
    // Received earlier but processing never completed: process again below.
  }

  const payment = body.payload?.payment?.entity;
  let handled = true;
  switch (body.event) {
    case "payment.captured":
    case "order.paid":
      if (payment?.order_id) await applyCapturedPayment(payment.order_id, payment, "webhook");
      else if (body.payload?.order?.entity?.id && payment) await applyCapturedPayment(body.payload.order.entity.id, payment, "webhook");
      break;
    case "payment.authorized":
      // Re-reads the payment from the gateway (and captures it if the account uses manual capture).
      if (payment?.order_id) await reconcileGatewayPayment(payment.order_id, payment.id, "webhook");
      break;
    case "payment.failed":
      if (payment?.order_id) await applyFailedPayment(payment.order_id, payment);
      break;
    case "refund.created":
    case "refund.processed":
    case "refund.failed": {
      const refund = body.payload?.refund?.entity;
      if (refund) await applyRefundEvent(refund, body.event);
      break;
    }
    default:
      handled = false;
  }

  await db.query(`update webhook_events set processed_at = now() where event_id = $1`, [eventId]);
  return handled ? "processed" : "ignored";
}

async function applyRefundEvent(refund: { id: string; payment_id: string; amount: number; status: string }, event: string) {
  await getDb().tx(async (q) => {
    const { rows: pay } = await q.query<Row>(`select * from payments where razorpay_payment_id = $1`, [refund.payment_id]);
    if (!pay[0]) return;
    const order = await lockOrder(q, "id", pay[0].order_id);
    if (!order) return;

    const status = event === "refund.processed" || refund.status === "processed" ? "processed" : event === "refund.failed" || refund.status === "failed" ? "failed" : "initiated";
    // Match our own row (created by admin) or one created from the Razorpay dashboard.
    const { rows: existing } = await q.query(
      `select id from refunds where razorpay_refund_id = $1
       union all select id from refunds where payment_id = $2 and razorpay_refund_id is null and status = 'initiated' limit 1`,
      [refund.id, pay[0].id],
    );
    if (existing[0]) {
      await q.query(
        `update refunds set razorpay_refund_id = $2, status = case when refunds.status = 'processed' then 'processed' else $3 end, updated_at = now() where id = $1`,
        [existing[0].id, refund.id, status],
      );
    } else {
      await q.query(
        `insert into refunds (order_id, payment_id, razorpay_refund_id, amount_paise, status, reason) values ($1, $2, $3, $4, $5, 'Created in Razorpay dashboard')`,
        [order.id, pay[0].id, refund.id, refund.amount, status],
      );
    }

    if (status === "failed") {
      await audit(q, null, "refund.failed", "order", order.id, { refundId: refund.id });
      return;
    }
    if (status === "processed") {
      await q.query(`update payments set status = 'refunded', updated_at = now() where id = $1`, [pay[0].id]);
      if (order.status !== "refunded") {
        await setStatus(q, order, "refunded", { type: "gateway" }, `Refund ${refund.id} processed`);
        await notifyOrder(q, order.id, "refund_processed");
      }
    } else if (!["refund_initiated", "refunded"].includes(order.status)) {
      await setStatus(q, order, "refund_initiated", { type: "gateway" }, `Refund ${refund.id} created`);
      await notifyOrder(q, order.id, "refund_initiated");
    }
  });
  await flushOutbox().catch(() => undefined);
}

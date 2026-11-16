import { formatPaise } from "@/lib/money";
import { STATUS_LABELS, type OrderStatus } from "@/lib/order-status";
import { getDb, type Queryable, type Row } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { orderAccessToken } from "@/lib/server/order-access";

export type NotificationKind =
  | "order_placed"
  | "payment_success"
  | "payment_failed"
  | "order_confirmed"
  | "order_dispatched"
  | "order_delivered"
  | "order_cancelled"
  | "refund_initiated"
  | "refund_processed";

const esc = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function orderLink(order: Row): string {
  return `${env.siteUrl}/order/${order.order_number}?t=${orderAccessToken(order.id)}`;
}

function compose(kind: NotificationKind, order: Row, items: Row[]): { subject: string; lines: string[] } {
  const no = order.order_number as string;
  const itemLines = items.map((i) => `${i.quantity} × ${i.name} — ${formatPaise(i.line_total_paise)}`);
  const summary = [...itemLines, `Delivery: ${formatPaise(order.delivery_fee_paise)}`, `Total: ${formatPaise(order.total_paise)}`];
  switch (kind) {
    case "order_placed":
      return {
        subject: `We have received your order ${no} — payment pending`,
        lines: [`Hi ${order.customer_name}, we have received your order ${no}. It is not confirmed until your payment is verified.`, ...summary],
      };
    case "payment_success":
      return {
        subject: `Payment received for order ${no}`,
        lines: [`Hi ${order.customer_name}, your payment of ${formatPaise(order.total_paise)} for order ${no} has been verified. Thank you!`, ...summary],
      };
    case "payment_failed":
      return {
        subject: `Payment failed for order ${no}`,
        lines: [`Hi ${order.customer_name}, the payment for order ${no} did not go through. You can retry from your order page while the order is held for you.`],
      };
    case "order_confirmed":
      return { subject: `Order ${no} confirmed`, lines: [`Hi ${order.customer_name}, your order ${no} is confirmed and we will start preparing it soon.`] };
    case "order_dispatched": {
      const courier = [order.courier_name, order.tracking_id].filter(Boolean).join(" — ");
      return {
        subject: `Order ${no} dispatched`,
        lines: [`Hi ${order.customer_name}, your order ${no} is on its way.`, ...(courier ? [`Courier: ${courier}`] : []), ...(order.tracking_url ? [`Track: ${order.tracking_url}`] : [])],
      };
    }
    case "order_delivered":
      return { subject: `Order ${no} delivered`, lines: [`Hi ${order.customer_name}, your order ${no} has been delivered. We hope you enjoy it!`] };
    case "order_cancelled":
      return { subject: `Order ${no} cancelled`, lines: [`Hi ${order.customer_name}, your order ${no} has been cancelled.${order.cancel_reason ? ` Reason: ${order.cancel_reason}` : ""}`] };
    case "refund_initiated":
      return { subject: `Refund initiated for order ${no}`, lines: [`Hi ${order.customer_name}, a refund of ${formatPaise(order.total_paise)} has been initiated for order ${no}. It usually reaches your original payment method in 5–7 working days.`] };
    case "refund_processed":
      return { subject: `Refund processed for order ${no}`, lines: [`Hi ${order.customer_name}, the refund of ${formatPaise(order.total_paise)} for order ${no} has been processed by the payment gateway.`] };
  }
}

function renderHtml(lines: string[], link: string): string {
  return `<div style="font-family:Georgia,serif;color:#2c1d13;max-width:560px;margin:auto;padding:24px;background:#faf7f2">
<h2 style="color:#43542a;margin:0 0 4px">The Vantillu Co.</h2><p style="margin:0 0 20px;color:#726253"><em>Traditional roots, modern soul.</em></p>
${lines.map((l) => `<p style="margin:8px 0">${esc(l)}</p>`).join("")}
<p style="margin-top:20px"><a href="${esc(link)}" style="color:#c4572d">View your order</a></p></div>`;
}

/** Queues a notification (idempotent via dedupe key) and tries to deliver it. Never throws. */
export async function notifyOrder(q: Queryable, orderId: string, kind: NotificationKind, extraKey = ""): Promise<void> {
  try {
    const { rows } = await q.query(`select * from orders where id = $1`, [orderId]);
    const order = rows[0];
    if (!order) return;
    const { rows: items } = await q.query(`select * from order_items where order_id = $1`, [orderId]);
    const { subject, lines } = compose(kind, order, items);
    const recipients: { to: string; admin: boolean }[] = [];
    let email = order.email as string | null;
    if (!email && order.user_id) {
      const { rows: u } = await q.query(`select email from users where id = $1`, [order.user_id]);
      email = u[0]?.email ?? null;
    }
    if (email) recipients.push({ to: email, admin: false });
    if (kind === "payment_success" && env.adminNotifyEmail) recipients.push({ to: env.adminNotifyEmail, admin: true });
    for (const r of recipients) {
      const body = r.admin ? `New paid order ${order.order_number} (${formatPaise(order.total_paise)}).\n${lines.slice(1).join("\n")}` : lines.join("\n\n");
      await q.query(
        `insert into notification_outbox (order_id, channel, kind, recipient, subject, body, dedupe_key)
         values ($1, 'email', $2, $3, $4, $5, $6) on conflict (dedupe_key) do nothing`,
        [orderId, kind, r.to, r.admin ? `New paid order ${order.order_number}` : subject, body, `${orderId}:${kind}:${extraKey}:${r.to}`],
      );
    }
  } catch (error) {
    console.error("Failed to queue notification", { kind, message: error instanceof Error ? error.message : "unknown" });
  }
}

/** Sends pending outbox rows. Called after state changes and by the cron endpoint for retries. */
export async function flushOutbox(limit = 20): Promise<{ sent: number; failed: number; skipped: number }> {
  const db = getDb();
  const stats = { sent: 0, failed: 0, skipped: 0 };
  const { rows } = await db.query(
    `update notification_outbox set attempts = attempts + 1
     where id in (select id from notification_outbox where status in ('pending','failed') and attempts < 5 order by created_at limit $1 for update skip locked)
     returning *`,
    [limit],
  );
  for (const row of rows) {
    let status: "sent" | "failed" | "skipped" = "sent";
    let error: string | null = null;
    try {
      if (row.channel !== "email") status = "skipped"; // WhatsApp sender plugs in here in a later phase.
      else if (!env.resendApiKey || !env.emailFrom) {
        status = "skipped";
        error = "Email provider not configured";
      } else {
        const link = row.order_id ? await orderLinkFor(row.order_id) : env.siteUrl;
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: env.emailFrom, to: [row.recipient], subject: row.subject, text: row.body, html: renderHtml(String(row.body).split("\n\n").flatMap((p: string) => p.split("\n")), link) }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw new Error(`Email provider responded ${response.status}`);
      }
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : "unknown";
    }
    stats[status] += 1;
    await db.query(`update notification_outbox set status = $2, last_error = $3, sent_at = case when $2 = 'sent' then now() else null end where id = $1`, [row.id, status, error]);
  }
  return stats;
}

async function orderLinkFor(orderId: string): Promise<string> {
  const { rows } = await getDb().query(`select id, order_number from orders where id = $1`, [orderId]);
  return rows[0] ? orderLink(rows[0]) : env.siteUrl;
}

export { STATUS_LABELS };
export type { OrderStatus };

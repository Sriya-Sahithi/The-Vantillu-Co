import { createHash } from "node:crypto";
import { buildTimeline, type OrderStatus } from "@/lib/order-status";
import { validateCheckoutFields, type CheckoutFields } from "@/lib/validation";
import { randomOrderNumber } from "@/lib/server/crypto";
import { getDb, type Queryable, type Row } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { ApiError, conflict, notFound } from "@/lib/server/http";
import { flushOutbox, notifyOrder } from "@/lib/server/notifications";
import { isValidOrderToken, orderAccessToken } from "@/lib/server/order-access";
import { lockOrder, releaseStock, reserveStock, setStatus } from "@/lib/server/order-core";
import { reconcileOrder } from "@/lib/server/payments";
import { normalizeCart, priceCart, type CartInput } from "@/lib/server/pricing";
import { createGatewayOrder, razorpayConfigured } from "@/lib/server/razorpay";

/** Unpaid orders hold stock for this long. */
export const HOLD_MINUTES = 30;

export type CreateOrderInput = {
  cart: unknown;
  fields: Partial<Record<keyof CheckoutFields, unknown>>;
  idempotencyKey: unknown;
  userId: string | null;
};

function cartHash(cart: CartInput, f: CheckoutFields): string {
  const lines = [...cart].sort((a, b) => a.slug.localeCompare(b.slug)).map((c) => `${c.slug}:${c.quantity}`).join(",");
  return createHash("sha256").update(`${lines}|${f.mobile}|${f.pincode}|${f.house}|${f.street}`).digest("hex");
}

export type CheckoutSession = {
  orderNumber: string;
  accessToken: string;
  totalPaise: number;
  razorpay: { keyId: string; orderId: string; amountPaise: number };
  reused: boolean;
};

export async function createOrder(input: CreateOrderInput): Promise<CheckoutSession> {
  if (!razorpayConfigured()) throw new ApiError(503, "payments_unavailable", "Online payments are not available right now.");
  const key = typeof input.idempotencyKey === "string" ? input.idempotencyKey : "";
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(key)) throw new ApiError(400, "bad_request", "Missing checkout reference. Please refresh the page.");

  const validated = validateCheckoutFields(input.fields);
  if (!validated.ok) throw new ApiError(400, "validation_failed", "Please correct the highlighted fields.", validated.errors as Record<string, string>);
  const fields = validated.value;
  const cart = normalizeCart(input.cart);
  const hash = cartHash(cart, fields);
  const db = getDb();

  await expireStaleOrders(5).catch(() => undefined);

  const prepared = await db.tx(async (q) => {
    // 1. Same idempotency key => same order (double click, retry after network error).
    const { rows: existingByKey } = await q.query(`select * from orders where idempotency_key = $1`, [key]);
    if (existingByKey[0]) {
      if (existingByKey[0].cart_hash !== hash) throw conflict("This checkout reference was already used for a different order. Please refresh the page.", "idempotency_conflict");
      return { order: existingByKey[0], reused: true };
    }
    // 2. Identical unpaid order in the hold window (second tab, repeated submit with a new key).
    const { rows: recent } = await q.query(
      `select * from orders where mobile = $1 and cart_hash = $2 and status = 'payment_pending' and expires_at > now() order by created_at desc limit 1 for update`,
      [fields.mobile, hash],
    );
    if (recent[0]) return { order: recent[0], reused: true };

    const quote = await priceCart(q, cart, fields.pincode, { lock: true });
    if (quote.issues.length) throw new ApiError(409, "cart_issues", quote.issues.map((i) => i.message).join(" "));
    if (!quote.delivery.serviceable || quote.totalPaise === null || quote.deliveryFeePaise === null) {
      throw new ApiError(422, "not_serviceable", quote.delivery.message ?? "We cannot deliver to this PIN code.", { pincode: quote.delivery.message ?? "Not serviceable." });
    }
    if (quote.totalPaise < 100) throw new ApiError(400, "bad_request", "Order total is too low.");

    let order: Row | undefined;
    for (let attempt = 0; attempt < 5 && !order; attempt += 1) {
      const { rows } = await q.query(
        `insert into orders (order_number, user_id, idempotency_key, cart_hash, status, customer_name, mobile, email,
           ship_house, ship_street, ship_landmark, ship_city, ship_district, ship_state, ship_pincode,
           subtotal_paise, delivery_fee_paise, total_paise, expires_at)
         values ($1,$2,$3,$4,'payment_pending',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, now() + make_interval(mins => $18))
         on conflict (order_number) do nothing returning *`,
        [randomOrderNumber(), input.userId, key, hash, fields.fullName, fields.mobile, fields.email || null, fields.house, fields.street, fields.landmark || null, fields.city, fields.district, fields.state, fields.pincode, quote.subtotalPaise, quote.deliveryFeePaise, quote.totalPaise, HOLD_MINUTES],
      );
      order = rows[0];
    }
    if (!order) throw new Error("Could not allocate an order number");

    for (const line of quote.lines) {
      await q.query(
        `insert into order_items (order_id, product_id, product_slug, name, description, image_url, pack_label, unit_price_paise, quantity, line_total_paise)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [order.id, line.productId, line.slug, line.name, line.description, line.image, line.packLabel, line.unitPricePaise, line.quantity, line.lineTotalPaise],
      );
      const upd = await q.query(`update products set stock = stock - $2, updated_at = now() where id = $1 and stock >= $2`, [line.productId, line.quantity]);
      if (!upd.rowCount) throw new ApiError(409, "cart_issues", `${line.name} just sold out.`);
    }
    await q.query(`insert into order_status_history (order_id, from_status, to_status, actor_type, actor_user_id, note) values ($1, null, 'payment_pending', $2, $3, 'Order placed')`, [order.id, input.userId ? "customer" : "system", input.userId]);
    return { order, reused: false };
  });

  let order = prepared.order;
  if (!order.razorpay_order_id) {
    try {
      const gateway = await createGatewayOrder(order.total_paise, order.order_number, { order_number: order.order_number });
      await db.query(`update orders set razorpay_order_id = $2, updated_at = now() where id = $1 and razorpay_order_id is null`, [order.id, gateway.id]);
      order = { ...order, razorpay_order_id: gateway.id };
    } catch (error) {
      await cancelUnpaid(order.id, "Could not start payment with the gateway");
      throw error;
    }
    await notifyOrder(db, order.id, "order_placed");
    await flushOutbox().catch(() => undefined);
  }
  // A concurrent request may have set a different gateway order id first; always read the stored one.
  const { rows } = await db.query(`select razorpay_order_id from orders where id = $1`, [order.id]);
  return {
    orderNumber: order.order_number,
    accessToken: orderAccessToken(order.id),
    totalPaise: order.total_paise,
    razorpay: { keyId: env.razorpayKeyId!, orderId: rows[0].razorpay_order_id, amountPaise: order.total_paise },
    reused: prepared.reused,
  };
}

/** Cancels an unpaid order and returns its stock. Safe to call repeatedly. */
export async function cancelUnpaid(orderId: string, reason: string): Promise<boolean> {
  return getDb().tx(async (q) => {
    const order = await lockOrder(q, "id", orderId);
    if (!order || !["payment_pending", "payment_failed"].includes(order.status)) return false;
    await releaseStock(q, order);
    await setStatus(q, order, "cancelled", { type: "system" }, reason, { cancel_reason: reason });
    return true;
  });
}

/**
 * Cancels unpaid orders past their hold window. Each is first reconciled with the gateway so a
 * late-confirmed payment is never lost.
 */
export async function expireStaleOrders(limit = 25): Promise<{ checked: number; cancelled: number }> {
  const db = getDb();
  const { rows } = await db.query(
    `select id, razorpay_order_id from orders where status in ('payment_pending','payment_failed') and expires_at < now() order by expires_at limit $1`,
    [limit],
  );
  let cancelled = 0;
  for (const row of rows) {
    if (row.razorpay_order_id) {
      try {
        const outcome = await reconcileOrder(row.razorpay_order_id);
        if (outcome === "paid" || outcome === "already_paid") continue;
      } catch (error) {
        console.error("Could not reconcile expiring order", { message: error instanceof Error ? error.message : "unknown" });
        continue; // gateway unreachable: keep the hold rather than risk cancelling a paid order
      }
    }
    if (await cancelUnpaid(row.id, "Payment not completed in time")) cancelled += 1;
  }
  return { checked: rows.length, cancelled };
}

/** Lets a customer retry payment on the same gateway order after a failure or dismissed checkout. */
export async function prepareRetry(orderNumber: string): Promise<CheckoutSession> {
  const db = getDb();
  return db.tx(async (q) => {
    const order = await lockOrder(q, "order_number", orderNumber);
    if (!order) throw notFound("Order not found.");
    if (!["payment_pending", "payment_failed"].includes(order.status) && !(order.status === "cancelled" && order.cancel_reason === "Payment not completed in time")) {
      throw conflict("This order can no longer be paid for.", "not_payable");
    }
    if (!order.razorpay_order_id) throw conflict("Payment could not be started for this order.", "not_payable");
    if (order.status === "cancelled" || order.expires_at < new Date()) {
      if (!(await reserveStock(q, order))) throw conflict("Sorry, some items are no longer in stock. Please place a new order.", "stock_unavailable");
      await q.query(`update orders set expires_at = now() + make_interval(mins => $2), cancel_reason = null where id = $1`, [order.id, HOLD_MINUTES]);
      await setStatus(q, order, "payment_pending", { type: "customer" }, "Payment retried after hold expired");
    } else if (order.status === "payment_failed") {
      await q.query(`update orders set expires_at = greatest(expires_at, now() + make_interval(mins => 10)) where id = $1`, [order.id]);
      await setStatus(q, order, "payment_pending", { type: "customer" }, "Customer retrying payment");
    }
    return {
      orderNumber: order.order_number,
      accessToken: orderAccessToken(order.id),
      totalPaise: order.total_paise,
      razorpay: { keyId: env.razorpayKeyId!, orderId: order.razorpay_order_id, amountPaise: order.total_paise },
      reused: true,
    };
  });
}

// ---------- reading orders ----------

export type OrderViewer = { userId: string | null; isAdmin: boolean };

/** Loads an order the viewer is entitled to see: owner (session), admin, or holder of the capability token. */
export async function loadAuthorizedOrder(q: Queryable, orderNumber: string, token: string | null, viewer: OrderViewer): Promise<Row> {
  const { rows } = await q.query(`select * from orders where order_number = $1`, [orderNumber]);
  const order = rows[0];
  // Same response whether the order is missing or not yours, so numbers cannot be probed.
  if (!order) throw notFound("Order not found.");
  const allowed = viewer.isAdmin || (viewer.userId !== null && order.user_id === viewer.userId) || isValidOrderToken(order.id, token);
  if (!allowed) throw notFound("Order not found.");
  return order;
}

export type OrderView = Awaited<ReturnType<typeof serializeOrder>>;

export async function serializeOrder(q: Queryable, order: Row, options: { admin?: boolean } = {}) {
  const [{ rows: items }, { rows: history }, { rows: payments }, { rows: refunds }] = await Promise.all([
    q.query(`select name, description, image_url, pack_label, product_slug, unit_price_paise, quantity, line_total_paise from order_items where order_id = $1 order by name`, [order.id]),
    q.query(`select to_status, created_at, actor_type, note from order_status_history where order_id = $1 order by id`, [order.id]),
    q.query(`select razorpay_payment_id, status, amount_paise, method, failure_reason, created_at from payments where order_id = $1 order by created_at`, [order.id]),
    q.query(`select razorpay_refund_id, status, amount_paise, created_at from refunds where order_id = $1 order by created_at`, [order.id]),
  ]);
  const status = order.status as OrderStatus;
  const captured = payments.find((p) => p.status === "captured" || p.status === "refunded");
  const paymentStatus: "paid" | "pending" | "failed" | "refunded" =
    status === "refunded" ? "refunded" : captured ? "paid" : status === "payment_failed" ? "failed" : "pending";
  const hasTracking = Boolean(order.courier_name || order.tracking_id || order.tracking_url);
  return {
    orderNumber: order.order_number as string,
    status,
    paymentStatus,
    createdAt: new Date(order.created_at).toISOString(),
    paidAt: order.paid_at ? new Date(order.paid_at).toISOString() : null,
    expiresAt: new Date(order.expires_at).toISOString(),
    canRetryPayment: ["payment_pending", "payment_failed"].includes(status),
    customer: { name: order.customer_name as string, mobile: order.mobile as string, email: (order.email as string | null) ?? null },
    address: {
      house: order.ship_house as string,
      street: order.ship_street as string,
      landmark: (order.ship_landmark as string | null) ?? null,
      city: order.ship_city as string,
      district: order.ship_district as string,
      state: order.ship_state as string,
      pincode: order.ship_pincode as string,
    },
    items: items.map((i) => ({ name: i.name as string, description: i.description as string, image: i.image_url as string, packLabel: i.pack_label as string | null, slug: i.product_slug as string, unitPricePaise: i.unit_price_paise as number, quantity: i.quantity as number, lineTotalPaise: i.line_total_paise as number })),
    subtotalPaise: order.subtotal_paise as number,
    deliveryFeePaise: order.delivery_fee_paise as number,
    totalPaise: order.total_paise as number,
    // Tracking is shown only when the admin actually entered it.
    tracking: hasTracking ? { courier: (order.courier_name as string | null) ?? null, trackingId: (order.tracking_id as string | null) ?? null, url: (order.tracking_url as string | null) ?? null } : null,
    timeline: buildTimeline(status, new Date(order.created_at).toISOString(), history.map((h) => ({ to_status: h.to_status, created_at: new Date(h.created_at).toISOString() }))),
    refunds: refunds.map((r) => ({ status: r.status as string, amountPaise: r.amount_paise as number, createdAt: new Date(r.created_at).toISOString() })),
    ...(options.admin
      ? {
          admin: {
            id: order.id as string,
            userId: (order.user_id as string | null) ?? null,
            cancelReason: (order.cancel_reason as string | null) ?? null,
            razorpayOrderId: (order.razorpay_order_id as string | null) ?? null,
            payments: payments.map((p) => ({ paymentId: p.razorpay_payment_id as string | null, status: p.status as string, amountPaise: p.amount_paise as number, method: p.method as string | null, failureReason: p.failure_reason as string | null })),
            history: history.map((h) => ({ status: h.to_status as string, at: new Date(h.created_at).toISOString(), actor: h.actor_type as string, note: h.note as string | null })),
          },
        }
      : {}),
  };
}

/**
 * Returns the order, first reconciling with the gateway when payment is still pending so that a
 * delayed webhook or a page refresh after paying always converges on the true state.
 */
export async function loadOrderView(orderNumber: string, token: string | null, viewer: OrderViewer, options: { reconcile?: boolean } = {}) {
  const db = getDb();
  let order = await loadAuthorizedOrder(db, orderNumber, token, viewer);
  if (options.reconcile && ["payment_pending", "payment_failed"].includes(order.status) && order.razorpay_order_id && razorpayConfigured()) {
    try {
      await reconcileOrder(order.razorpay_order_id);
    } catch (error) {
      console.error("Order reconcile failed", { message: error instanceof Error ? error.message : "unknown" });
    }
    order = await loadAuthorizedOrder(db, orderNumber, token, viewer);
  }
  return serializeOrder(db, order);
}

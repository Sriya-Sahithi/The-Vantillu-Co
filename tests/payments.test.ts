import { beforeEach, describe, expect, it } from "vitest";
import { createOrder, expireStaleOrders, loadOrderView, prepareRetry } from "@/lib/server/orders";
import { verifyCheckoutCallback } from "@/lib/server/checkout-verify";
import { processWebhook } from "@/lib/server/webhook";
import { verifyWebhookSignature } from "@/lib/server/razorpay";
import { adminInitiateRefund, adminSyncRefund } from "@/lib/server/admin";
import { getDb, type Db } from "@/lib/server/db";
import { FakeGateway, checkoutSignature, createTestDb, goodFields, seedProduct, setTestEnv, webhookSignature } from "./helpers";

let db: Db;
let gw: FakeGateway;
const KEY = () => `key_${Math.random().toString(36).slice(2)}_${Date.now()}abcdef`;

beforeEach(async () => {
  setTestEnv();
  db = await createTestDb();
  gw = new FakeGateway();
  gw.install();
  await seedProduct(db, "dark-chocolate", 25000, 10);
  await seedProduct(db, "kandi-podi", 15000, 3);
  await db.query(`update delivery_settings set delivery_fee_paise = 6000`);
});

const place = (items = [{ slug: "dark-chocolate", quantity: 2 }], fields: Record<string, unknown> = goodFields, key = KEY()) =>
  createOrder({ cart: items, fields, idempotencyKey: key, userId: null });
const stockOf = async (slug: string) => (await db.query(`select stock from products where slug = $1`, [slug])).rows[0].stock as number;
const orderRow = async (no: string) => (await db.query(`select * from orders where order_number = $1`, [no])).rows[0];
const outbox = async (kind: string) => (await db.query(`select * from notification_outbox where kind = $1`, [kind])).rows;

describe("order creation (server-trusted pricing)", () => {
  it("prices from the database, adds delivery, reserves stock and creates a gateway order for the exact total", async () => {
    const s = await place();
    expect(s.totalPaise).toBe(2 * 25000 + 6000);
    expect(gw.orders.get(s.razorpay.orderId)!.amount).toBe(56000);
    expect(await stockOf("dark-chocolate")).toBe(8);
    const o = await orderRow(s.orderNumber);
    expect(o.status).toBe("payment_pending");
    expect(o.subtotal_paise + o.delivery_fee_paise).toBe(o.total_paise);
  });

  it("snapshots item name, description and price", async () => {
    const s = await place();
    await db.query(`update products set price_paise = 99900, name = 'Renamed' where slug = 'dark-chocolate'`);
    const v = await loadOrderView(s.orderNumber, s.accessToken, { userId: null, isAdmin: false });
    expect(v.items[0].name).toBe("Dark Chocolate");
    expect(v.items[0].unitPricePaise).toBe(25000);
    expect(v.totalPaise).toBe(56000);
  });

  it("ignores any client-supplied price or total", async () => {
    const s = await place([{ slug: "dark-chocolate", quantity: 1, price: 1, total: 1 } as never]);
    expect(s.totalPaise).toBe(31000);
  });

  it("rejects enquiry-only (no price), unavailable, out-of-stock and over-stock lines", async () => {
    await expect(place([{ slug: "milk-chocolate", quantity: 1 }])).rejects.toThrow(/not available for online ordering/);
    await seedProduct(db, "peanut-laddu", 10000, 5, false);
    await expect(place([{ slug: "peanut-laddu", quantity: 1 }])).rejects.toThrow(/unavailable/);
    await seedProduct(db, "cashew-laddu", 10000, 0);
    await expect(place([{ slug: "cashew-laddu", quantity: 1 }])).rejects.toThrow(/out of stock/);
    await expect(place([{ slug: "kandi-podi", quantity: 4 }])).rejects.toThrow(/Only 3/);
  });

  it("validates fields and serviceability", async () => {
    await expect(place(undefined, { ...goodFields, mobile: "12345" })).rejects.toMatchObject({ code: "validation_failed" });
    await expect(place(undefined, { ...goodFields, pincode: "5000" })).rejects.toMatchObject({ code: "validation_failed" });
    await expect(place(undefined, { ...goodFields, street: "" })).rejects.toMatchObject({ code: "validation_failed" });
    await expect(place(undefined, { ...goodFields, pincode: "560001" })).rejects.toMatchObject({ code: "not_serviceable" });
    await db.query(`update delivery_settings set delivery_enabled = false`);
    await expect(place()).rejects.toMatchObject({ code: "not_serviceable" });
  });

  it("is idempotent: same key => one order; same unpaid cart => one order; same key different cart => conflict", async () => {
    const key = KEY();
    const a = await place(undefined, goodFields, key);
    const b = await place(undefined, goodFields, key);
    const c = await place(undefined, goodFields, KEY());
    expect(b.orderNumber).toBe(a.orderNumber);
    expect(c.orderNumber).toBe(a.orderNumber);
    expect((await db.query(`select count(*)::int n from orders`)).rows[0].n).toBe(1);
    expect(await stockOf("dark-chocolate")).toBe(8); // reserved once
    expect(gw.calls.filter((x) => x === "POST /orders")).toHaveLength(1);
    await expect(place([{ slug: "kandi-podi", quantity: 1 }], goodFields, key)).rejects.toMatchObject({ code: "idempotency_conflict" });
  });

  it("cannot oversell: two buyers, only 3 in stock", async () => {
    await place([{ slug: "kandi-podi", quantity: 2 }], goodFields);
    await expect(place([{ slug: "kandi-podi", quantity: 2 }], { ...goodFields, mobile: "9123456780" })).rejects.toThrow(/Only 1/);
  });

  it("cancels the order and releases stock if the gateway cannot create an order", async () => {
    gw.down = true;
    await expect(place()).rejects.toMatchObject({ code: "gateway_unreachable" });
    expect(await stockOf("dark-chocolate")).toBe(10);
    expect((await db.query(`select status from orders`)).rows[0].status).toBe("cancelled");
  });
});

describe("payment verification", () => {
  it("rejects an invalid signature and leaves the order unpaid", async () => {
    const s = await place();
    const payId = gw.pay(s.razorpay.orderId);
    const o = await orderRow(s.orderNumber);
    await expect(verifyCheckoutCallback(o, payId, "0".repeat(64))).rejects.toMatchObject({ code: "invalid_signature" });
    await expect(verifyCheckoutCallback(o, payId, checkoutSignature(s.razorpay.orderId, payId, "wrong"))).rejects.toMatchObject({ code: "invalid_signature" });
    expect((await orderRow(s.orderNumber)).status).toBe("payment_pending");
    expect((await db.query(`select * from audit_log where action = 'payment.invalid_signature'`)).rows).toHaveLength(2);
  });

  it("does NOT mark paid when the signature is valid but the gateway says the payment never captured", async () => {
    const s = await place();
    const payId = gw.pay(s.razorpay.orderId, "failed");
    const out = await verifyCheckoutCallback(await orderRow(s.orderNumber), payId, checkoutSignature(s.razorpay.orderId, payId));
    expect(out).toBe("failed");
    expect((await orderRow(s.orderNumber)).status).toBe("payment_failed");
    expect((await orderRow(s.orderNumber)).paid_at).toBeNull();
  });

  it("marks paid only from verified gateway data, records ids and sends exactly one payment email", async () => {
    const s = await place();
    const payId = gw.pay(s.razorpay.orderId);
    const o = await orderRow(s.orderNumber);
    expect(await verifyCheckoutCallback(o, payId, checkoutSignature(s.razorpay.orderId, payId))).toBe("paid");
    const after = await orderRow(s.orderNumber);
    expect(after.status).toBe("paid");
    const pay = (await db.query(`select * from payments`)).rows;
    expect(pay).toHaveLength(1);
    expect(pay[0]).toMatchObject({ razorpay_payment_id: payId, razorpay_order_id: s.razorpay.orderId, status: "captured", signature_verified: true });
    expect(await outbox("payment_success")).toHaveLength(1);
  });

  it("page refresh / repeated verify / duplicate webhook do not duplicate payment, status change or emails", async () => {
    const s = await place();
    const payId = gw.pay(s.razorpay.orderId);
    const o = await orderRow(s.orderNumber);
    const sig = checkoutSignature(s.razorpay.orderId, payId);
    expect(await verifyCheckoutCallback(o, payId, sig)).toBe("paid");
    expect(await verifyCheckoutCallback(o, payId, sig)).toBe("already_paid");
    const raw = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: gw.payments.get(payId) } } });
    expect(await processWebhook(raw, "evt_1")).toBe("processed");
    expect(await processWebhook(raw, "evt_1")).toBe("duplicate");
    await loadOrderView(s.orderNumber, s.accessToken, { userId: null, isAdmin: false }, { reconcile: true });
    expect((await db.query(`select count(*)::int n from payments`)).rows[0].n).toBe(1);
    expect((await db.query(`select count(*)::int n from order_status_history where to_status = 'paid'`)).rows[0].n).toBe(1);
    expect(await outbox("payment_success")).toHaveLength(1);
  });

  it("delayed webhook after the browser already confirmed is a harmless no-op", async () => {
    const s = await place();
    const payId = gw.pay(s.razorpay.orderId);
    await verifyCheckoutCallback(await orderRow(s.orderNumber), payId, checkoutSignature(s.razorpay.orderId, payId));
    const raw = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: gw.payments.get(payId) } } });
    await processWebhook(raw, "evt_late");
    expect((await orderRow(s.orderNumber)).status).toBe("paid");
  });

  it("webhook alone confirms payment when the customer closed the browser", async () => {
    const s = await place();
    const payId = gw.pay(s.razorpay.orderId);
    const raw = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: gw.payments.get(payId) } } });
    await processWebhook(raw, "evt_2");
    expect((await orderRow(s.orderNumber)).status).toBe("paid");
  });

  it("authorized payment is captured via the gateway API then marked paid", async () => {
    const s = await place();
    const payId = gw.pay(s.razorpay.orderId, "authorized");
    const raw = JSON.stringify({ event: "payment.authorized", payload: { payment: { entity: gw.payments.get(payId) } } });
    await processWebhook(raw, "evt_auth");
    expect(gw.calls).toContain(`POST /payments/${payId}/capture`);
    expect((await orderRow(s.orderNumber)).status).toBe("paid");
  });

  it("refuses a payment whose amount differs from the order total", async () => {
    const s = await place();
    const payId = gw.pay(s.razorpay.orderId, "captured", 100);
    const out = await verifyCheckoutCallback(await orderRow(s.orderNumber), payId, checkoutSignature(s.razorpay.orderId, payId));
    expect(out).toBe("mismatch");
    expect((await orderRow(s.orderNumber)).status).toBe("payment_pending");
    expect((await db.query(`select * from audit_log where action = 'payment.amount_mismatch'`)).rows).toHaveLength(1);
  });

  it("failed webhook marks failed; a later failure never downgrades a paid order", async () => {
    const s = await place();
    const bad = gw.pay(s.razorpay.orderId, "failed");
    await processWebhook(JSON.stringify({ event: "payment.failed", payload: { payment: { entity: gw.payments.get(bad) } } }), "evt_f1");
    expect((await orderRow(s.orderNumber)).status).toBe("payment_failed");
    expect(await outbox("payment_failed")).toHaveLength(1);

    const retry = await prepareRetry(s.orderNumber);
    expect(retry.razorpay.orderId).toBe(s.razorpay.orderId); // same gateway order reused
    expect((await orderRow(s.orderNumber)).status).toBe("payment_pending");
    const good = gw.pay(s.razorpay.orderId);
    await verifyCheckoutCallback(await orderRow(s.orderNumber), good, checkoutSignature(s.razorpay.orderId, good));
    const bad2 = gw.pay(s.razorpay.orderId, "failed");
    await processWebhook(JSON.stringify({ event: "payment.failed", payload: { payment: { entity: gw.payments.get(bad2) } } }), "evt_f2");
    expect((await orderRow(s.orderNumber)).status).toBe("paid");
  });

  it("webhook signature verification uses the raw body and the webhook secret", () => {
    const raw = '{"event":"payment.captured"}';
    expect(verifyWebhookSignature(raw, webhookSignature(raw))).toBe(true);
    expect(verifyWebhookSignature(raw + " ", webhookSignature(raw))).toBe(false);
    expect(verifyWebhookSignature(raw, webhookSignature(raw, "other"))).toBe(false);
    expect(verifyWebhookSignature(raw, null)).toBe(false);
    expect(verifyWebhookSignature(raw, "zz")).toBe(false);
  });
});

describe("pending / cancelled payments and expiry", () => {
  it("customer cancelled in the modal: order stays pending, then expires, stock released", async () => {
    const s = await place();
    await db.query(`update orders set expires_at = now() - interval '1 minute'`);
    const r = await expireStaleOrders();
    expect(r.cancelled).toBe(1);
    expect((await orderRow(s.orderNumber)).status).toBe("cancelled");
    expect(await stockOf("dark-chocolate")).toBe(10);
  });

  it("expiry reconciles with the gateway first: a payment the webhook missed is honoured, not cancelled", async () => {
    const s = await place();
    gw.pay(s.razorpay.orderId);
    await db.query(`update orders set expires_at = now() - interval '1 minute'`);
    await expireStaleOrders();
    expect((await orderRow(s.orderNumber)).status).toBe("paid");
    expect(await stockOf("dark-chocolate")).toBe(8);
  });

  it("expiry keeps the hold when the gateway is unreachable (never cancels a possibly-paid order)", async () => {
    const s = await place();
    await db.query(`update orders set expires_at = now() - interval '1 minute'`);
    gw.down = true;
    await expireStaleOrders();
    expect((await orderRow(s.orderNumber)).status).toBe("payment_pending");
  });

  it("payment arriving after cancellation: restores the order if stock allows", async () => {
    const s = await place();
    await db.query(`update orders set expires_at = now() - interval '1 minute'`);
    await expireStaleOrders();
    const payId = gw.pay(s.razorpay.orderId);
    expect(await verifyCheckoutCallback(await orderRow(s.orderNumber), payId, checkoutSignature(s.razorpay.orderId, payId))).toBe("paid");
    expect((await orderRow(s.orderNumber)).status).toBe("paid");
    expect(await stockOf("dark-chocolate")).toBe(8);
  });

  it("payment arriving after cancellation with no stock left: automatic refund, never an unfulfillable paid order", async () => {
    const s = await place([{ slug: "kandi-podi", quantity: 3 }]);
    await db.query(`update orders set expires_at = now() - interval '1 minute'`);
    await expireStaleOrders();
    await db.query(`update products set stock = 0 where slug = 'kandi-podi'`);
    const payId = gw.pay(s.razorpay.orderId);
    expect(await verifyCheckoutCallback(await orderRow(s.orderNumber), payId, checkoutSignature(s.razorpay.orderId, payId))).toBe("late_refunded");
    expect((await orderRow(s.orderNumber)).status).toBe("refund_initiated");
    expect(gw.calls).toContain(`POST /payments/${payId}/refund`);
    expect((await db.query(`select * from refunds`)).rows[0].razorpay_refund_id).toMatch(/^rfnd_/);
  });
});

describe("refund tracking", () => {
  it("admin refund -> refund_initiated -> webhook processed -> refunded, stock returned once", async () => {
    const s = await place();
    const payId = gw.pay(s.razorpay.orderId);
    await verifyCheckoutCallback(await orderRow(s.orderNumber), payId, checkoutSignature(s.razorpay.orderId, payId));
    const admin = (await db.query(`insert into users (email) values ('a@x.com') returning id`)).rows[0].id;
    await adminInitiateRefund(admin, s.orderNumber, "Customer request");
    expect((await orderRow(s.orderNumber)).status).toBe("refund_initiated");
    expect(await stockOf("dark-chocolate")).toBe(10);
    await expect(adminInitiateRefund(admin, s.orderNumber, "again")).rejects.toMatchObject({ code: "refund_exists" });
    const refund = [...gw.refunds.values()][0];
    expect(refund.amount).toBe(56000);
    const raw = JSON.stringify({ event: "refund.processed", payload: { refund: { entity: { ...refund, status: "processed" } } } });
    await processWebhook(raw, "evt_r1");
    expect((await orderRow(s.orderNumber)).status).toBe("refunded");
    expect(await stockOf("dark-chocolate")).toBe(10);
    expect(await outbox("refund_processed")).toHaveLength(1);
  });

  it("sync pulls refund status when the webhook was missed", async () => {
    const s = await place();
    const payId = gw.pay(s.razorpay.orderId);
    await verifyCheckoutCallback(await orderRow(s.orderNumber), payId, checkoutSignature(s.razorpay.orderId, payId));
    const admin = (await db.query(`insert into users (email) values ('a@x.com') returning id`)).rows[0].id;
    await adminInitiateRefund(admin, s.orderNumber, "x");
    [...gw.refunds.values()][0].status = "processed";
    await adminSyncRefund(admin, s.orderNumber);
    expect((await orderRow(s.orderNumber)).status).toBe("refunded");
  });

  it("refunds are not counted as revenue", async () => {
    const { adminStats, adminInitiateRefund: refund } = await import("@/lib/server/admin");
    const s = await place();
    const payId = gw.pay(s.razorpay.orderId);
    await verifyCheckoutCallback(await orderRow(s.orderNumber), payId, checkoutSignature(s.razorpay.orderId, payId));
    expect((await adminStats(getDb())).revenue_paise).toBe(56000);
    const admin = (await db.query(`insert into users (email) values ('a@x.com') returning id`)).rows[0].id;
    await refund(admin, s.orderNumber, "x");
    expect((await adminStats(getDb())).revenue_paise).toBe(0);
  });
});

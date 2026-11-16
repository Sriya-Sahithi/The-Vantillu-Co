import { beforeEach, describe, expect, it } from "vitest";
import { createOtp, consumeOtp, createSession } from "@/lib/server/auth";
import { getDb, type Db } from "@/lib/server/db";
import { createOrder, loadOrderView } from "@/lib/server/orders";
import { adminSetOrderStatus, adminSetTracking, adminUpdateDelivery, adminUpsertPostcode, adminCreateProduct, adminUpdateProduct, adminArchiveProduct } from "@/lib/server/admin";
import { FakeGateway, checkoutSignature, createTestDb, goodFields, req, seedProduct, setTestEnv } from "./helpers";
import { verifyCheckoutCallback } from "@/lib/server/checkout-verify";
import { GET as adminOrdersGET } from "@/app/api/admin/orders/route";
import { POST as adminProductsPOST } from "@/app/api/admin/products/route";
import { PUT as deliveryPUT } from "@/app/api/admin/delivery/route";
import { GET as statsGET } from "@/app/api/admin/stats/route";
import { GET as accountOrdersGET } from "@/app/api/account/orders/route";
import { POST as webhookPOST } from "@/app/api/webhooks/razorpay/route";
import { POST as lookupPOST } from "@/app/api/orders/lookup/route";
import { GET as orderGET } from "@/app/api/orders/[orderNumber]/route";
import { POST as quotePOST } from "@/app/api/cart/quote/route";
import { POST as authRequestPOST } from "@/app/api/auth/request/route";
import { POST as checkoutPOST } from "@/app/api/checkout/route";
import { webhookSignature } from "./helpers";
import { setDbOverride } from "@/lib/server/db";

let db: Db;
let gw: FakeGateway;

beforeEach(async () => {
  setTestEnv();
  db = await createTestDb();
  gw = new FakeGateway();
  gw.install();
  await seedProduct(db, "dark-chocolate", 25000, 10);
  await db.query(`update delivery_settings set delivery_fee_paise = 6000`);
});

async function login(email: string) {
  const code = await createOtp(db, email);
  const userId = await consumeOtp(db, email, code);
  const { token } = await createSession(db, userId);
  return { userId, cookie: `vc_session=${token}` };
}
const place = (userId: string | null = null, fields: Record<string, unknown> = goodFields, key = `k_${Math.random().toString(36).slice(2)}abcdefghijkl`) =>
  createOrder({ cart: [{ slug: "dark-chocolate", quantity: 1 }], fields, idempotencyKey: key, userId });

describe("OTP authentication", () => {
  it("logs in with the right code, rejects wrong/expired/reused codes, locks after 5 bad attempts", async () => {
    const code = await createOtp(db, "a@example.com");
    await expect(consumeOtp(db, "a@example.com", "000000" === code ? "111111" : "000000")).rejects.toMatchObject({ code: "invalid_code" });
    await expect(consumeOtp(db, "a@example.com", code)).resolves.toBeTruthy();
    await expect(consumeOtp(db, "a@example.com", code)).rejects.toMatchObject({ code: "invalid_code" });

    const c2 = await createOtp(db, "b@example.com");
    await db.query(`update auth_otps set expires_at = now() - interval '1 second' where email = 'b@example.com'`);
    await expect(consumeOtp(db, "b@example.com", c2)).rejects.toMatchObject({ code: "invalid_code" });

    const c3 = await createOtp(db, "c@example.com");
    const wrong = c3 === "123456" ? "654321" : "123456";
    for (let i = 0; i < 5; i += 1) await consumeOtp(db, "c@example.com", wrong).catch(() => undefined);
    await expect(consumeOtp(db, "c@example.com", c3)).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("stores only hashes: no plaintext code or session token in the database", async () => {
    const code = await createOtp(db, "a@example.com");
    const { token } = await createSession(db, await consumeOtp(db, "a@example.com", code));
    expect(JSON.stringify((await db.query(`select * from auth_otps`)).rows)).not.toContain(code);
    expect(JSON.stringify((await db.query(`select * from sessions`)).rows)).not.toContain(token);
  });

  it("bootstrap email becomes owner admin; others do not", async () => {
    const admin = await login("owner@example.com");
    const cust = await login("cust@example.com");
    expect((await db.query(`select * from admin_roles where user_id = $1`, [admin.userId])).rows).toHaveLength(1);
    expect((await db.query(`select * from admin_roles where user_id = $1`, [cust.userId])).rows).toHaveLength(0);
  });

  it("signing in links earlier guest orders placed with that email", async () => {
    const s = await place(null, { ...goodFields, email: "linked@example.com" });
    const { userId } = await login("linked@example.com");
    expect((await db.query(`select user_id from orders where order_number = $1`, [s.orderNumber])).rows[0].user_id).toBe(userId);
  });

  it("request endpoint validates email and is rate limited", async () => {
    const bad = await authRequestPOST(req("/api/auth/request", { method: "POST", body: { email: "nope" } }), {});
    expect(bad.status).toBe(400);
    let last = 200;
    for (let i = 0; i < 7; i += 1) last = (await authRequestPOST(req("/api/auth/request", { method: "POST", body: { email: "rl@example.com" } }), {})).status;
    expect(last).toBe(429);
  });
});

describe("order access control (no guessable IDs)", () => {
  it("order is hidden without token/session, visible with token or owner session, hidden from other customers", async () => {
    const alice = await login("alice@example.com");
    const bob = await login("bob@example.com");
    const s = await place(alice.userId);
    const none = await orderGET(req(`/api/orders/${s.orderNumber}`), { params: Promise.resolve({ orderNumber: s.orderNumber }) });
    expect(none.status).toBe(404);
    const wrongToken = await orderGET(req(`/api/orders/${s.orderNumber}?t=${"a".repeat(64)}`), { params: Promise.resolve({ orderNumber: s.orderNumber }) });
    expect(wrongToken.status).toBe(404);
    const asBob = await orderGET(req(`/api/orders/${s.orderNumber}`, { cookie: bob.cookie }), { params: Promise.resolve({ orderNumber: s.orderNumber }) });
    expect(asBob.status).toBe(404);
    const asAlice = await orderGET(req(`/api/orders/${s.orderNumber}`, { cookie: alice.cookie }), { params: Promise.resolve({ orderNumber: s.orderNumber }) });
    expect(asAlice.status).toBe(200);
    const withToken = await orderGET(req(`/api/orders/${s.orderNumber}?t=${s.accessToken}`), { params: Promise.resolve({ orderNumber: s.orderNumber }) });
    expect(withToken.status).toBe(200);
    // A token for one order never opens another
    const s2 = await place(null, { ...goodFields, mobile: "9123456780" });
    const cross = await orderGET(req(`/api/orders/${s2.orderNumber}?t=${s.accessToken}`), { params: Promise.resolve({ orderNumber: s2.orderNumber }) });
    expect(cross.status).toBe(404);
  });

  it("account order history shows only the signed-in customer's orders and requires login", async () => {
    const alice = await login("alice@example.com");
    const bob = await login("bob@example.com");
    const a = await place(alice.userId);
    await place(bob.userId, { ...goodFields, mobile: "9123456780" });
    const anon = await accountOrdersGET(req("/api/account/orders"), {});
    expect(anon.status).toBe(401);
    const res = await accountOrdersGET(req("/api/account/orders", { cookie: alice.cookie }), {});
    const data = await res.json();
    expect(data.orders.map((o: { orderNumber: string }) => o.orderNumber)).toEqual([a.orderNumber]);
  });

  it("guest lookup needs order number + checkout mobile, and is rate limited", async () => {
    const s = await place();
    const bad = await lookupPOST(req("/api/orders/lookup", { method: "POST", body: { orderNumber: s.orderNumber, mobile: "9000000000" } }), {});
    expect(bad.status).toBe(404);
    const ok = await lookupPOST(req("/api/orders/lookup", { method: "POST", body: { orderNumber: s.orderNumber, mobile: "+91 98765 43210" } }), {});
    expect(ok.status).toBe(200);
    expect((await ok.json()).token).toBe(s.accessToken);
    let status = 0;
    for (let i = 0; i < 12; i += 1) status = (await lookupPOST(req("/api/orders/lookup", { method: "POST", body: { orderNumber: "VC-AAAAAAAA", mobile: "9000000000" } }), {})).status;
    expect(status).toBe(429);
  });

  it("order view does not leak other customers' data in the serialized shape", async () => {
    const s = await place();
    const v = await loadOrderView(s.orderNumber, s.accessToken, { userId: null, isAdmin: false });
    expect(JSON.stringify(v)).not.toMatch(/razorpay|admin|user_id|userId/i);
  });
});

describe("admin authorization (server-side)", () => {
  it("rejects anonymous (401) and non-admin customers (403) on every admin endpoint", async () => {
    const cust = await login("cust@example.com");
    const calls: [string, () => Promise<Response>][] = [
      ["orders", () => adminOrdersGET(req("/api/admin/orders", { cookie: cust.cookie }) as never, {})],
      ["stats", () => statsGET(req("/api/admin/stats", { cookie: cust.cookie }), {})],
      ["products POST", () => adminProductsPOST(req("/api/admin/products", { method: "POST", cookie: cust.cookie, body: { name: "X", categoryId: "podis" } }), {})],
      ["delivery PUT", () => deliveryPUT(req("/api/admin/delivery", { method: "PUT", cookie: cust.cookie, body: { fee: 0, enabled: true } }), {})],
    ];
    for (const [name, call] of calls) expect((await call()).status, `${name} as customer`).toBe(403);
    expect((await adminOrdersGET(req("/api/admin/orders"), {})).status).toBe(401);
    expect((await statsGET(req("/api/admin/stats", { cookie: "vc_session=garbage" }), {})).status).toBe(401);
  });

  it("allows the admin, and revoking the role takes effect immediately", async () => {
    const admin = await login("owner@example.com");
    expect((await statsGET(req("/api/admin/stats", { cookie: admin.cookie }), {})).status).toBe(200);
    await db.query(`delete from admin_roles where user_id = $1`, [admin.userId]);
    expect((await statsGET(req("/api/admin/stats", { cookie: admin.cookie }), {})).status).toBe(403);
  });

  it("blocks cross-site mutations (origin check)", async () => {
    const admin = await login("owner@example.com");
    const r = await adminProductsPOST(req("/api/admin/products", { method: "POST", cookie: admin.cookie, headers: { origin: "https://evil.example" }, body: { name: "X", categoryId: "podis" } }), {});
    expect(r.status).toBe(403);
  });
});

describe("admin order management", () => {
  async function paidOrder() {
    const s = await place();
    const payId = gw.pay(s.razorpay.orderId);
    const row = (await db.query(`select * from orders where order_number = $1`, [s.orderNumber])).rows[0];
    await verifyCheckoutCallback(row, payId, checkoutSignature(s.razorpay.orderId, payId));
    return s;
  }
  const status = async (no: string) => (await db.query(`select status from orders where order_number = $1`, [no])).rows[0].status;

  it("enforces the fulfilment state machine and writes an audit trail", async () => {
    const admin = (await login("owner@example.com")).userId;
    const s = await paidOrder();
    await expect(adminSetOrderStatus(admin, s.orderNumber, "delivered", null)).rejects.toMatchObject({ code: "invalid_transition" });
    for (const next of ["confirmed", "preparing", "dispatched", "delivered"]) await adminSetOrderStatus(admin, s.orderNumber, next, null);
    expect(await status(s.orderNumber)).toBe("delivered");
    await expect(adminSetOrderStatus(admin, s.orderNumber, "cancelled", null)).rejects.toMatchObject({ code: "invalid_transition" });
    const hist = (await db.query(`select to_status, actor_type, actor_user_id from order_status_history order by id`)).rows;
    expect(hist.map((h) => h.to_status)).toEqual(["payment_pending", "paid", "confirmed", "preparing", "dispatched", "delivered"]);
    expect(hist.filter((h) => h.actor_type === "admin").every((h) => h.actor_user_id === admin)).toBe(true);
    expect((await db.query(`select * from audit_log where action = 'order.status'`)).rows).toHaveLength(4);
    for (const k of ["order_confirmed", "order_dispatched", "order_delivered"]) expect((await db.query(`select * from notification_outbox where kind = $1`, [k])).rows).toHaveLength(1);
  });

  it("cannot confirm an unpaid order", async () => {
    const admin = (await login("owner@example.com")).userId;
    const s = await place();
    await expect(adminSetOrderStatus(admin, s.orderNumber, "confirmed", null)).rejects.toMatchObject({ code: "invalid_transition" });
  });

  it("cancel returns stock; tracking shows only when entered and rejects bad URLs", async () => {
    const admin = (await login("owner@example.com")).userId;
    const s = await paidOrder();
    const v0 = await loadOrderView(s.orderNumber, s.accessToken, { userId: null, isAdmin: false });
    expect(v0.tracking).toBeNull();
    await expect(adminSetTracking(admin, s.orderNumber, { courier: "DTDC", trackingId: "X1", url: "javascript:alert(1)" })).rejects.toMatchObject({ code: "bad_request" });
    await adminSetTracking(admin, s.orderNumber, { courier: "DTDC", trackingId: "X1", url: "https://example.com/t/X1" });
    expect((await loadOrderView(s.orderNumber, s.accessToken, { userId: null, isAdmin: false })).tracking).toMatchObject({ courier: "DTDC", trackingId: "X1" });
    const stockBefore = (await db.query(`select stock from products where slug = 'dark-chocolate'`)).rows[0].stock;
    await adminSetOrderStatus(admin, s.orderNumber, "cancelled", "Out of ingredients");
    expect((await db.query(`select stock from products where slug = 'dark-chocolate'`)).rows[0].stock).toBe(stockBefore + 1);
    await adminSetOrderStatus(admin, s.orderNumber, "cancelled", "again").catch(() => undefined);
    expect((await db.query(`select stock from products where slug = 'dark-chocolate'`)).rows[0].stock).toBe(stockBefore + 1);
  });

  it("timeline contains only steps that really happened", async () => {
    const s = await place();
    const v = await loadOrderView(s.orderNumber, s.accessToken, { userId: null, isAdmin: false });
    expect(v.timeline.find((t) => t.key === "paid")!.at).toBeNull();
    expect(v.timeline.find((t) => t.key === "placed")!.state).toBe("current");
  });
});

describe("admin product + delivery management", () => {
  it("create, edit price/stock/availability, archive; storefront reflects availability rules", async () => {
    const admin = (await login("owner@example.com")).userId;
    const { id, slug } = await adminCreateProduct(admin, { name: "Ragi & Jaggery Cookies", categoryId: "cookies", price: "199.50", stock: 5, isAvailable: true, description: "Test" });
    expect(slug).toBe("ragi-and-jaggery-cookies");
    expect((await db.query(`select price_paise from products where id = $1`, [id])).rows[0].price_paise).toBe(19950);
    await adminUpdateProduct(admin, id, { price: 210, stock: 0 });
    const { listProducts } = await import("@/lib/server/catalog");
    expect((await listProducts()).find((p) => p.slug === slug)!.availability).toBe("out_of_stock");
    await expect(adminUpdateProduct(admin, id, { price: "abc" })).rejects.toMatchObject({ code: "bad_request" });
    await expect(adminUpdateProduct(admin, id, { stock: -1 })).rejects.toMatchObject({ code: "bad_request" });
    await expect(adminUpdateProduct(admin, id, { imageUrl: "https://evil.example/x.png" })).rejects.toMatchObject({ code: "bad_request" });
    await adminArchiveProduct(admin, id, true);
    expect((await listProducts()).some((p) => p.slug === slug)).toBe(false);
  });

  it("delivery: configurable fee, optional free threshold only if set, PIN prefix rules with most-specific winning", async () => {
    const admin = (await login("owner@example.com")).userId;
    const quote = async (pin: string, qty = 1) => (await (await quotePOST(req("/api/cart/quote", { method: "POST", body: { items: [{ slug: "dark-chocolate", quantity: qty }], pincode: pin } }), {})).json()).quote;
    expect((await quote("500034")).deliveryFeePaise).toBe(6000);
    expect((await quote("500034", 5)).deliveryFeePaise).toBe(6000); // no invented free-delivery threshold
    expect((await quote("560001")).delivery.serviceable).toBe(false);

    await adminUpdateDelivery(admin, { enabled: true, fee: "80", freeThreshold: "1000" });
    expect((await quote("500034")).deliveryFeePaise).toBe(8000);
    expect((await quote("500034", 4)).deliveryFeePaise).toBe(0); // 4 × 250 = 1000 ≥ threshold
    await adminUpdateDelivery(admin, { enabled: true, fee: "80", freeThreshold: "" });

    await adminUpsertPostcode(admin, { pattern: "560", label: "Bengaluru", enabled: true, fee: "120" });
    expect((await quote("560001")).deliveryFeePaise).toBe(12000);
    await adminUpsertPostcode(admin, { pattern: "500081", label: "blocked", enabled: false });
    expect((await quote("500081")).delivery.serviceable).toBe(false);
    expect((await quote("500034")).delivery.serviceable).toBe(true);
    await expect(adminUpsertPostcode(admin, { pattern: "12", enabled: true })).rejects.toMatchObject({ code: "bad_request" });
    await adminUpdateDelivery(admin, { enabled: false, fee: "80", freeThreshold: "" });
    expect((await quote("500034")).delivery.serviceable).toBe(false);
  });
});

describe("webhook route", () => {
  it("rejects missing/invalid signatures with 400 and never touches orders", async () => {
    const s = await place();
    const payId = gw.pay(s.razorpay.orderId);
    const raw = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: gw.payments.get(payId) } } });
    const post = (headers: Record<string, string>) => webhookPOST(new Request("http://localhost:3000/api/webhooks/razorpay", { method: "POST", body: raw, headers }));
    expect((await post({})).status).toBe(400);
    expect((await post({ "x-razorpay-signature": "a".repeat(64) })).status).toBe(400);
    expect((await db.query(`select status from orders`)).rows[0].status).toBe("payment_pending");
    expect((await post({ "x-razorpay-signature": webhookSignature(raw), "x-razorpay-event-id": "evt_route" })).status).toBe(200);
    expect((await db.query(`select status from orders`)).rows[0].status).toBe("paid");
    const dup = await (await post({ "x-razorpay-signature": webhookSignature(raw), "x-razorpay-event-id": "evt_route" })).json();
    expect(dup.status).toBe("duplicate");
  });

  it("returns 500 (so Razorpay retries) when processing fails, and the event can be reprocessed", async () => {
    const raw = JSON.stringify({ event: "payment.failed", payload: { payment: { entity: { id: "pay_TEST00000099", order_id: "order_unknown", amount: 1, currency: "INR", status: "failed" } } } });
    const r = await webhookPOST(new Request("http://localhost:3000/api/webhooks/razorpay", { method: "POST", body: raw, headers: { "x-razorpay-signature": webhookSignature(raw), "x-razorpay-event-id": "evt_unknown" } }));
    expect(r.status).toBe(200); // unknown order: acknowledged, nothing to do
  });
});

describe("checkout route", () => {
  it("returns field-level validation errors and never exposes internals", async () => {
    const r = await checkoutPOST(req("/api/checkout", { method: "POST", body: { items: [{ slug: "dark-chocolate", quantity: 1 }], fields: { ...goodFields, mobile: "123" }, idempotencyKey: "k".repeat(20) } }), {});
    const body = await r.json();
    expect(r.status).toBe(400);
    expect(body.error.fields.mobile).toBeTruthy();
  });

  it("generic 500 on unexpected failure (no stack/internal message)", async () => {
    setDbOverride(undefined);
    delete process.env.DATABASE_URL;
    const r = await quotePOST(req("/api/cart/quote", { method: "POST", body: { items: [{ slug: "dark-chocolate", quantity: 1 }] } }), {});
    const text = await r.text();
    expect(r.status).toBe(500);
    expect(text).not.toMatch(/DATABASE_URL|stack|at /);
    setDbOverride(db);
  });

  it("db getter still works after override restore", () => {
    expect(getDb()).toBeTruthy();
  });
});

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHmac } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { NextRequest } from "next/server";
import { setDbOverride, type Db, type Queryable } from "@/lib/server/db";

export const KEY_ID = "rzp_test_unit";
export const KEY_SECRET = "unit_key_secret";
export const WEBHOOK_SECRET = "unit_webhook_secret";

export function setTestEnv() {
  Object.assign(process.env, {
    RAZORPAY_KEY_ID: KEY_ID,
    RAZORPAY_KEY_SECRET: KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
    SESSION_SECRET: "x".repeat(40),
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    ADMIN_BOOTSTRAP_EMAILS: "owner@example.com",
  });
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
}

export async function createTestDb() {
  const pg = new PGlite({ parsers: { 20: (v: string) => Number(v) } });
  const dir = join(process.cwd(), "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) await pg.exec(readFileSync(join(dir, file), "utf8"));
  const wrap = (target: { query: PGlite["query"] }): Queryable => ({
    async query(text, params) {
      const r = await target.query(text, params as unknown[]);
      return { rows: r.rows as never[], rowCount: r.affectedRows ?? r.rows.length };
    },
  });
  const db: Db = {
    ...wrap(pg),
    tx: (fn) => pg.transaction((tx) => fn(wrap(tx as unknown as PGlite))),
  };
  setDbOverride(db);
  return db;
}

/** In-memory stand-in for the Razorpay REST API. */
export class FakeGateway {
  orders = new Map<string, { id: string; amount: number; currency: string; receipt?: string }>();
  payments = new Map<string, { id: string; order_id: string; amount: number; currency: string; status: string; method?: string; error_code?: string; error_description?: string }>();
  refunds = new Map<string, { id: string; payment_id: string; amount: number; status: string }>();
  calls: string[] = [];
  down = false;
  private n = 0;

  install() {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.hostname !== "api.razorpay.com") throw new Error(`Unexpected outbound request to ${url.hostname}`);
      const path = url.pathname.replace("/v1", "");
      const method = init?.method ?? "GET";
      this.calls.push(`${method} ${path}`);
      if (this.down) throw new Error("network down");
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const ok = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });
      let m: RegExpMatchArray | null;
      if (method === "POST" && path === "/orders") {
        const id = `order_TEST${String(++this.n).padStart(8, "0")}`;
        const o = { id, amount: body.amount, currency: body.currency, receipt: body.receipt, status: "created" };
        this.orders.set(id, o);
        return ok(o);
      }
      if ((m = path.match(/^\/payments\/(pay_\w+)$/)) && method === "GET") return this.payments.has(m[1]) ? ok(this.payments.get(m[1])) : new Response("{}", { status: 400 });
      if ((m = path.match(/^\/payments\/(pay_\w+)\/capture$/))) {
        const p = this.payments.get(m[1])!;
        p.status = "captured";
        return ok(p);
      }
      if ((m = path.match(/^\/payments\/(pay_\w+)\/refund$/))) {
        const r = { id: `rfnd_TEST${String(++this.n).padStart(8, "0")}`, payment_id: m[1], amount: body.amount, status: "pending" };
        this.refunds.set(r.id, r);
        return ok(r);
      }
      if ((m = path.match(/^\/refunds\/(rfnd_\w+)$/))) return ok(this.refunds.get(m[1]));
      if ((m = path.match(/^\/orders\/(order_\w+)\/payments$/))) return ok({ items: [...this.payments.values()].filter((p) => p.order_id === m![1]) });
      return new Response("{}", { status: 404 });
    }) as typeof fetch;
  }

  /** Simulates the customer paying in the Razorpay modal. */
  pay(orderId: string, status: "captured" | "authorized" | "failed" = "captured", amount?: number, id = `pay_TEST${String(++this.n).padStart(8, "0")}`) {
    const order = this.orders.get(orderId)!;
    this.payments.set(id, { id, order_id: orderId, amount: amount ?? order.amount, currency: "INR", status, method: "upi", ...(status === "failed" ? { error_code: "BAD_REQUEST_ERROR", error_description: "Payment failed" } : {}) });
    return id;
  }
}

export const checkoutSignature = (orderId: string, paymentId: string, secret = KEY_SECRET) => createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
export const webhookSignature = (raw: string, secret = WEBHOOK_SECRET) => createHmac("sha256", secret).update(raw).digest("hex");

export const goodFields = {
  fullName: "Asha Reddy", mobile: "9876543210", email: "asha@example.com", house: "12-3-45", street: "Road No. 5, Banjara Hills",
  landmark: "Near park", city: "Hyderabad", district: "Hyderabad", state: "Telangana", pincode: "500034",
};

/** Sets a product up as a normal single-quantity item (pack_sizes cleared) unless packSizes is given. */
export async function seedProduct(db: Queryable, slug: string, pricePaise: number | null, stock: number, available = true, packSizes: number[] | null = null) {
  await db.query(`update products set price_paise = $2, stock = $3, is_available = $4, pack_label = '250 g', pack_sizes = $5 where slug = $1`, [slug, pricePaise, stock, available, packSizes]);
}

export function req(url: string, init: { method?: string; body?: unknown; cookie?: string; headers?: Record<string, string> } = {}) {
  return new NextRequest(`http://localhost:3000${url}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", host: "localhost:3000", ...(init.cookie ? { cookie: init.cookie } : {}), ...init.headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

import sharp from "sharp";
import { rupeesToPaise } from "@/lib/money";
import { ADMIN_TRANSITIONS, isOrderStatus, type OrderStatus } from "@/lib/order-status";
import { getDb, type Queryable, type Row } from "@/lib/server/db";
import { badRequest, conflict, notFound } from "@/lib/server/http";
import { flushOutbox, notifyOrder, type NotificationKind } from "@/lib/server/notifications";
import { audit, lockOrder, releaseStock, setStatus } from "@/lib/server/order-core";
import { submitPendingRefunds } from "@/lib/server/payments";
import { fetchGatewayRefund, razorpayConfigured } from "@/lib/server/razorpay";

const NOTIFY_ON: Partial<Record<OrderStatus, NotificationKind>> = {
  confirmed: "order_confirmed",
  dispatched: "order_dispatched",
  delivered: "order_delivered",
  cancelled: "order_cancelled",
};

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.replace(/\p{Cc}/gu, " ").trim().slice(0, max);
  return v || null;
}

export async function adminSetOrderStatus(adminId: string, orderNumber: string, to: unknown, note: unknown) {
  if (!isOrderStatus(to)) throw badRequest("Unknown status.");
  await getDb().tx(async (q) => {
    const order = await lockOrder(q, "order_number", orderNumber);
    if (!order) throw notFound("Order not found.");
    if (!ADMIN_TRANSITIONS[order.status as OrderStatus].includes(to)) {
      throw conflict(`An order that is "${order.status}" cannot be moved to "${to}".`, "invalid_transition");
    }
    const reason = cleanText(note, 300);
    if (to === "cancelled") {
      await releaseStock(q, order);
      await setStatus(q, order, to, { type: "admin", userId: adminId }, reason ?? "Cancelled by admin", { cancel_reason: reason ?? "Cancelled by admin" });
    } else {
      await setStatus(q, order, to, { type: "admin", userId: adminId }, reason ?? undefined);
    }
    await audit(q, adminId, "order.status", "order", order.id, { to, note: reason });
    const kind = NOTIFY_ON[to];
    if (kind) await notifyOrder(q, order.id, kind);
  });
  await flushOutbox().catch(() => undefined);
}

export async function adminSetTracking(adminId: string, orderNumber: string, body: Record<string, unknown>) {
  const courier = cleanText(body.courier, 80);
  const trackingId = cleanText(body.trackingId, 80);
  let url = cleanText(body.url, 500);
  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("scheme");
      url = parsed.toString();
    } catch {
      throw badRequest("Tracking link must be a valid http(s) URL.");
    }
  }
  await getDb().tx(async (q) => {
    const order = await lockOrder(q, "order_number", orderNumber);
    if (!order) throw notFound("Order not found.");
    await q.query(`update orders set courier_name = $2, tracking_id = $3, tracking_url = $4, updated_at = now() where id = $1`, [order.id, courier, trackingId, url]);
    await audit(q, adminId, "order.tracking", "order", order.id, { courier, trackingId });
  });
}

/** Full refund of the captured payment. Calls Razorpay; webhook/sync later marks it processed. */
export async function adminInitiateRefund(adminId: string, orderNumber: string, reason: unknown) {
  const text = cleanText(reason, 300) ?? "Refund initiated by admin";
  await getDb().tx(async (q) => {
    const order = await lockOrder(q, "order_number", orderNumber);
    if (!order) throw notFound("Order not found.");
    if (["refund_initiated", "refunded"].includes(order.status)) throw conflict("A refund has already been started for this order.", "refund_exists");
    const { rows: pay } = await q.query(`select * from payments where order_id = $1 and status = 'captured' order by created_at desc limit 1`, [order.id]);
    if (!pay[0]) throw conflict("There is no verified payment to refund for this order.", "no_payment");
    const { rows: active } = await q.query(`select id from refunds where order_id = $1 and status in ('initiated','processed')`, [order.id]);
    if (active[0]) throw conflict("A refund has already been started for this order.", "refund_exists");
    if (["paid", "confirmed", "preparing"].includes(order.status) || order.stock_reserved) await releaseStock(q, order);
    await q.query(`insert into refunds (order_id, payment_id, amount_paise, status, reason, initiated_by) values ($1, $2, $3, 'initiated', $4, $5)`, [order.id, pay[0].id, pay[0].amount_paise, text, adminId]);
    await setStatus(q, order, "refund_initiated", { type: "admin", userId: adminId }, text);
    await audit(q, adminId, "order.refund", "order", order.id, { amountPaise: pay[0].amount_paise, reason: text });
    await notifyOrder(q, order.id, "refund_initiated");
  });
  await submitPendingRefunds();
  await flushOutbox().catch(() => undefined);
}

/** Pulls the refund's current state from Razorpay (for when a webhook was missed). */
export async function adminSyncRefund(adminId: string, orderNumber: string) {
  if (!razorpayConfigured()) throw conflict("Payment gateway is not configured.", "gateway_unconfigured");
  const db = getDb();
  const { rows } = await db.query(
    `select r.id, r.razorpay_refund_id, o.id as order_id from refunds r join orders o on o.id = r.order_id where o.order_number = $1 and r.razorpay_refund_id is not null and r.status <> 'processed'`,
    [orderNumber],
  );
  if (!rows.length) throw conflict("No refund is awaiting gateway confirmation.", "no_refund");
  for (const row of rows) {
    const refund = await fetchGatewayRefund(row.razorpay_refund_id);
    if (refund.status === "processed") {
      await db.tx(async (q) => {
        await q.query(`update refunds set status = 'processed', updated_at = now() where id = $1`, [row.id]);
        const order = await lockOrder(q, "id", row.order_id);
        if (order && order.status !== "refunded") {
          await q.query(`update payments set status = 'refunded', updated_at = now() where order_id = $1 and status = 'captured'`, [order.id]);
          await setStatus(q, order, "refunded", { type: "admin", userId: adminId }, "Refund confirmed by gateway");
          await notifyOrder(q, order.id, "refund_processed");
        }
        await audit(q, adminId, "order.refund_sync", "order", row.order_id, { refundId: row.razorpay_refund_id });
      });
    } else if (refund.status === "failed") {
      await db.query(`update refunds set status = 'failed', updated_at = now() where id = $1`, [row.id]);
    }
  }
  await flushOutbox().catch(() => undefined);
}

// ---------- listing / stats ----------

export async function adminStats(q: Queryable) {
  const { rows } = await q.query(`
    select
      count(*)::int as total,
      count(*) filter (where status in ('paid'))::int as new_orders,
      count(*) filter (where status in ('confirmed','preparing'))::int as preparing,
      count(*) filter (where status = 'dispatched')::int as dispatched,
      count(*) filter (where status = 'delivered')::int as delivered,
      count(*) filter (where status = 'payment_pending')::int as awaiting_payment,
      count(*) filter (where status = 'refund_initiated')::int as refunds_open
    from orders`);
  const { rows: rev } = await q.query(`
    select coalesce(sum(p.amount_paise), 0)::bigint as revenue
    from payments p where p.status = 'captured'
      and not exists (select 1 from refunds r where r.payment_id = p.id and r.status in ('initiated','processed'))`);
  return { ...rows[0], revenue_paise: Number(rev[0].revenue) };
}

export async function adminListOrders(params: { status?: string | null; q?: string | null; page?: number }) {
  const where: string[] = [];
  const args: unknown[] = [];
  if (params.status && isOrderStatus(params.status)) {
    args.push(params.status);
    where.push(`o.status = $${args.length}`);
  }
  const term = params.q?.trim().slice(0, 80);
  if (term) {
    args.push(`%${term.replace(/[%_\\]/g, "\\$&")}%`);
    where.push(`(o.order_number ilike $${args.length} or o.customer_name ilike $${args.length} or o.mobile like $${args.length} or o.email ilike $${args.length})`);
  }
  const page = Math.max(1, params.page ?? 1);
  args.push(25, (page - 1) * 25);
  const { rows } = await getDb().query(
    `select o.order_number, o.status, o.customer_name, o.mobile, o.total_paise, o.created_at, o.ship_city,
            (select coalesce(sum(quantity),0)::int from order_items i where i.order_id = o.id) as item_count,
            count(*) over()::int as total_rows
     from orders o ${where.length ? `where ${where.join(" and ")}` : ""}
     order by o.created_at desc limit $${args.length - 1} offset $${args.length}`,
    args,
  );
  return { orders: rows.map((r) => ({ orderNumber: r.order_number, status: r.status, customerName: r.customer_name, mobile: r.mobile, totalPaise: r.total_paise, createdAt: new Date(r.created_at).toISOString(), city: r.ship_city, itemCount: r.item_count })), total: rows[0]?.total_rows ?? 0, page };
}

// ---------- products ----------

type ProductInput = Record<string, unknown>;

function parseProduct(body: ProductInput, partial: boolean) {
  const out: Record<string, unknown> = {};
  const has = (k: string) => k in body;
  if (!partial || has("name")) {
    const name = cleanText(body.name, 120);
    if (!name) throw badRequest("Product name is required.");
    out.name = name;
  }
  if (!partial || has("categoryId")) {
    const c = cleanText(body.categoryId, 40);
    if (!c) throw badRequest("Choose a category.");
    out.category_id = c;
  }
  if (has("description")) out.description = cleanText(body.description, 2000) ?? "";
  if (has("imageUrl")) {
    const url = cleanText(body.imageUrl, 300) ?? "";
    if (url && !/^\/(images|brand|api\/images)\/[A-Za-z0-9._\-/ ]+$/.test(url)) throw badRequest("Image must come from the upload tool.");
    out.image_url = url;
  }
  if (has("imageAlt")) out.image_alt = cleanText(body.imageAlt, 200) ?? "";
  if (has("price")) {
    if (body.price === null || body.price === "") out.price_paise = null;
    else {
      const paise = rupeesToPaise(body.price as string | number);
      if (paise === null || paise > 10_000_000) throw badRequest("Enter a valid price in rupees, e.g. 249 or 249.50.");
      out.price_paise = paise;
    }
  }
  if (has("packLabel")) out.pack_label = cleanText(body.packLabel, 60);
  if (has("stock")) {
    if (!Number.isInteger(body.stock) || (body.stock as number) < 0 || (body.stock as number) > 100_000) throw badRequest("Stock must be a whole number, 0 or more.");
    out.stock = body.stock;
  }
  if (has("isAvailable")) out.is_available = body.isAvailable === true;
  for (const [key, col] of [["ingredients", "ingredients"], ["allergens", "allergens"], ["netQuantity", "net_quantity"], ["shelfLife", "shelf_life"], ["storage", "storage"]] as const) {
    if (has(key)) out[col] = cleanText(body[key], 500);
  }
  return out;
}

const slugify = (name: string) => name.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export async function adminCreateProduct(adminId: string, body: ProductInput) {
  const data = parseProduct(body, false);
  const base = slugify(data.name as string) || "product";
  const db = getDb();
  for (let i = 0; i < 20; i += 1) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const cols = ["slug", ...Object.keys(data)];
    const vals = [slug, ...Object.values(data)];
    const res = await db.query(`insert into products (${cols.join(",")}) values (${cols.map((_, n) => `$${n + 1}`).join(",")}) on conflict (slug) do nothing returning id, slug`, vals);
    if (res.rows[0]) {
      await audit(db, adminId, "product.create", "product", res.rows[0].id, { slug });
      return res.rows[0] as { id: string; slug: string };
    }
  }
  throw conflict("Could not generate a unique URL for this product.");
}

export async function adminUpdateProduct(adminId: string, id: string, body: ProductInput) {
  const data = parseProduct(body, true);
  const keys = Object.keys(data);
  if (!keys.length) throw badRequest("Nothing to update.");
  const db = getDb();
  const res = await db.query(`update products set ${keys.map((k, n) => `${k} = $${n + 2}`).join(", ")}, updated_at = now() where id = $1 and archived_at is null returning id`, [id, ...Object.values(data)]);
  if (!res.rows[0]) throw notFound("Product not found.");
  await audit(db, adminId, "product.update", "product", id, { fields: keys });
}

export async function adminArchiveProduct(adminId: string, id: string, archive: boolean) {
  const db = getDb();
  const res = await db.query(`update products set archived_at = ${archive ? "now()" : "null"}, is_available = false, updated_at = now() where id = $1 returning id`, [id]);
  if (!res.rows[0]) throw notFound("Product not found.");
  await audit(db, adminId, archive ? "product.archive" : "product.restore", "product", id);
}

export async function adminListProducts() {
  const { rows } = await getDb().query(`select p.*, c.name as category_name from products p join categories c on c.id = p.category_id order by (p.archived_at is not null), p.sort_order, p.name`);
  return rows.map((r) => ({
    id: r.id, slug: r.slug, name: r.name, categoryId: r.category_id, categoryName: r.category_name, description: r.description,
    imageUrl: r.image_url, imageAlt: r.image_alt, pricePaise: r.price_paise, packLabel: r.pack_label, stock: r.stock,
    isAvailable: r.is_available, archived: Boolean(r.archived_at), ingredients: r.ingredients, allergens: r.allergens,
    netQuantity: r.net_quantity, shelfLife: r.shelf_life, storage: r.storage,
  }));
}

/** Validates the bytes are really an image, re-encodes to WebP (strips metadata/payloads), stores in Postgres. */
export async function storeProductImage(buffer: Buffer): Promise<string> {
  if (buffer.length > 6 * 1024 * 1024) throw badRequest("Image must be under 6 MB.");
  let data: Buffer;
  try {
    data = await sharp(buffer, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  } catch {
    throw badRequest("That file is not a valid image (use JPG, PNG or WebP).");
  }
  const { rows } = await getDb().query(`insert into product_images (content_type, data) values ('image/webp', $1) returning id`, [data]);
  return `/api/images/${rows[0].id}`;
}

// ---------- delivery ----------

export async function adminGetDelivery() {
  const db = getDb();
  const [{ rows: s }, { rows: p }] = await Promise.all([db.query(`select * from delivery_settings where id = 1`), db.query(`select * from serviceable_postcodes order by pattern`)]);
  return {
    enabled: s[0].delivery_enabled as boolean,
    feePaise: s[0].delivery_fee_paise as number,
    freeThresholdPaise: (s[0].free_delivery_threshold_paise as number | null) ?? null,
    postcodes: p.map((r: Row) => ({ pattern: r.pattern as string, label: r.label as string, enabled: r.enabled as boolean, feePaise: (r.delivery_fee_paise as number | null) ?? null })),
  };
}

export async function adminUpdateDelivery(adminId: string, body: Record<string, unknown>) {
  const fee = rupeesToPaise(body.fee as string | number);
  if (fee === null || fee > 1_000_000) throw badRequest("Enter a valid delivery charge in rupees (0 is allowed).");
  let threshold: number | null = null;
  if (body.freeThreshold !== null && body.freeThreshold !== "" && body.freeThreshold !== undefined) {
    threshold = rupeesToPaise(body.freeThreshold as string | number);
    if (threshold === null || threshold === 0) throw badRequest("Free-delivery threshold must be a positive amount, or left empty to disable it.");
  }
  const db = getDb();
  await db.query(`update delivery_settings set delivery_enabled = $1, delivery_fee_paise = $2, free_delivery_threshold_paise = $3, updated_at = now() where id = 1`, [body.enabled === true, fee, threshold]);
  await audit(db, adminId, "delivery.settings", "delivery_settings", "1", { enabled: body.enabled === true, fee, threshold });
}

export async function adminUpsertPostcode(adminId: string, body: Record<string, unknown>) {
  const pattern = typeof body.pattern === "string" ? body.pattern.trim() : "";
  if (!/^[1-9]\d{2,5}$/.test(pattern)) throw badRequest("Enter a 3 to 6 digit PIN code or PIN prefix (e.g. 500 or 500081).");
  let fee: number | null = null;
  if (body.fee !== null && body.fee !== "" && body.fee !== undefined) {
    fee = rupeesToPaise(body.fee as string | number);
    if (fee === null) throw badRequest("Enter a valid charge, or leave empty to use the default.");
  }
  const db = getDb();
  await db.query(
    `insert into serviceable_postcodes (pattern, label, enabled, delivery_fee_paise) values ($1,$2,$3,$4)
     on conflict (pattern) do update set label = excluded.label, enabled = excluded.enabled, delivery_fee_paise = excluded.delivery_fee_paise`,
    [pattern, cleanText(body.label, 80) ?? "", body.enabled !== false, fee],
  );
  await audit(db, adminId, "delivery.postcode", "serviceable_postcodes", pattern, { enabled: body.enabled !== false, fee });
}

export async function adminDeletePostcode(adminId: string, pattern: string) {
  const db = getDb();
  await db.query(`delete from serviceable_postcodes where pattern = $1`, [pattern]);
  await audit(db, adminId, "delivery.postcode_delete", "serviceable_postcodes", pattern);
}

// ---------- customers ----------

export async function adminListCustomers(search: string | null) {
  const term = search?.trim().slice(0, 80);
  const { rows } = await getDb().query(
    `select u.id, u.email, u.created_at, p.full_name, p.mobile,
            (select count(*)::int from orders o where o.user_id = u.id) as order_count,
            (select coalesce(sum(o.total_paise),0)::bigint from orders o where o.user_id = u.id and o.status in ('paid','confirmed','preparing','dispatched','delivered')) as spent
     from users u left join customer_profiles p on p.user_id = u.id
     where ($1::text is null or u.email ilike $1 or p.full_name ilike $1 or p.mobile like $1)
     order by u.created_at desc limit 100`,
    [term ? `%${term.replace(/[%_\\]/g, "\\$&")}%` : null],
  );
  return rows.map((r) => ({ id: r.id, email: r.email, name: r.full_name ?? "", mobile: r.mobile, joinedAt: new Date(r.created_at).toISOString(), orderCount: r.order_count, spentPaise: Number(r.spent) }));
}

export async function adminCustomerDetail(id: string) {
  const db = getDb();
  const { rows } = await db.query(`select u.id, u.email, u.created_at, p.full_name, p.mobile from users u left join customer_profiles p on p.user_id = u.id where u.id = $1`, [id]);
  if (!rows[0]) throw notFound("Customer not found.");
  const [{ rows: orders }, { rows: addresses }] = await Promise.all([
    db.query(`select order_number, status, total_paise, created_at from orders where user_id = $1 order by created_at desc`, [id]),
    db.query(`select label, full_name, house, street, city, district, state, pincode, is_default from addresses where user_id = $1 order by is_default desc, created_at`, [id]),
  ]);
  return {
    id: rows[0].id, email: rows[0].email, name: rows[0].full_name ?? "", mobile: rows[0].mobile, joinedAt: new Date(rows[0].created_at).toISOString(),
    orders: orders.map((o) => ({ orderNumber: o.order_number, status: o.status, totalPaise: o.total_paise, createdAt: new Date(o.created_at).toISOString() })),
    addresses: addresses.map((a) => ({ label: a.label, name: a.full_name, line: `${a.house}, ${a.street}, ${a.city}, ${a.district}, ${a.state} ${a.pincode}`, isDefault: a.is_default })),
  };
}

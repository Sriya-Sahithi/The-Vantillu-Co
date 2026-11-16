import type { OrderStatus } from "@/lib/order-status";
import type { Queryable, Row } from "@/lib/server/db";

export type Actor = { type: "system" | "customer" | "admin" | "gateway"; userId?: string | null };

/** Single place where an order's status changes, so every change is audited. */
export async function setStatus(q: Queryable, order: Row, to: OrderStatus, actor: Actor, note?: string, extra: Record<string, unknown> = {}) {
  const from = order.status as string;
  const sets = ["status = $2", "updated_at = now()"];
  const params: unknown[] = [order.id, to];
  for (const [column, value] of Object.entries(extra)) {
    if (!/^[a-z_]+$/.test(column)) throw new Error("invalid column");
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  }
  await q.query(`update orders set ${sets.join(", ")} where id = $1`, params);
  await q.query(
    `insert into order_status_history (order_id, from_status, to_status, actor_type, actor_user_id, note) values ($1, $2, $3, $4, $5, $6)`,
    [order.id, from, to, actor.type, actor.userId ?? null, note ?? null],
  );
  order.status = to;
}

export async function lockOrder(q: Queryable, where: "id" | "razorpay_order_id" | "order_number", value: string): Promise<Row | null> {
  const { rows } = await q.query(`select * from orders where ${where} = $1 for update`, [value]);
  return rows[0] ?? null;
}

/** Returns reserved units to stock. Idempotent through the stock_reserved flag. */
export async function releaseStock(q: Queryable, order: Row) {
  if (!order.stock_reserved) return;
  await q.query(
    `update products p set stock = p.stock + i.quantity, updated_at = now()
     from order_items i where i.order_id = $1 and i.product_id = p.id`,
    [order.id],
  );
  await q.query(`update orders set stock_reserved = false where id = $1`, [order.id]);
  order.stock_reserved = false;
}

/** Re-reserves stock for an order whose reservation was released. All-or-nothing. */
export async function reserveStock(q: Queryable, order: Row): Promise<boolean> {
  if (order.stock_reserved) return true;
  const { rows: items } = await q.query(`select product_id, quantity from order_items where order_id = $1 order by product_id`, [order.id]);
  for (const item of items) {
    if (!item.product_id) return false;
    const { rows } = await q.query(`select stock from products where id = $1 for update`, [item.product_id]);
    if (!rows[0] || rows[0].stock < item.quantity) return false;
  }
  for (const item of items) await q.query(`update products set stock = stock - $2, updated_at = now() where id = $1`, [item.product_id, item.quantity]);
  await q.query(`update orders set stock_reserved = true where id = $1`, [order.id]);
  order.stock_reserved = true;
  return true;
}

export async function audit(q: Queryable, actorUserId: string | null, action: string, entity: string, entityId: string | null, details: Record<string, unknown> = {}) {
  await q.query(`insert into audit_log (actor_user_id, action, entity, entity_id, details) values ($1, $2, $3, $4, $5)`, [
    actorUserId,
    action,
    entity,
    entityId,
    JSON.stringify(details),
  ]);
}

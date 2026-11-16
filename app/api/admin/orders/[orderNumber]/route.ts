import { adminInitiateRefund, adminSetOrderStatus, adminSetTracking, adminSyncRefund } from "@/lib/server/admin";
import { requireAdmin } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { badRequest, readJson, route } from "@/lib/server/http";
import { loadAuthorizedOrder, serializeOrder } from "@/lib/server/orders";
import { ADMIN_TRANSITIONS } from "@/lib/order-status";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ orderNumber: string }> };

export const GET = route<Ctx>(async (req, ctx) => {
  await requireAdmin(req);
  const { orderNumber } = await ctx.params;
  const order = await loadAuthorizedOrder(getDb(), orderNumber.toUpperCase(), null, { userId: null, isAdmin: true });
  const view = await serializeOrder(getDb(), order, { admin: true });
  return { order: view, allowedTransitions: ADMIN_TRANSITIONS[view.status] };
});

/** One endpoint, explicit actions: status | tracking | refund | sync_refund. */
export const POST = route<Ctx>(async (req, ctx) => {
  const admin = await requireAdmin(req);
  const { orderNumber } = await ctx.params;
  const no = orderNumber.toUpperCase();
  const body = await readJson(req);
  switch (body.action) {
    case "status":
      await adminSetOrderStatus(admin.id, no, body.status, body.note);
      break;
    case "tracking":
      await adminSetTracking(admin.id, no, body);
      break;
    case "refund":
      await adminInitiateRefund(admin.id, no, body.reason);
      break;
    case "sync_refund":
      await adminSyncRefund(admin.id, no);
      break;
    default:
      throw badRequest("Unknown action.");
  }
  return { ok: true };
});

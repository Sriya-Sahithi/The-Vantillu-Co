import { adminGetDelivery, adminUpdateDelivery } from "@/lib/server/admin";
import { requireAdmin } from "@/lib/server/auth";
import { readJson, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin(req);
  return { delivery: await adminGetDelivery() };
});

export const PUT = route(async (req) => {
  const admin = await requireAdmin(req);
  await adminUpdateDelivery(admin.id, await readJson(req));
  return { ok: true };
});

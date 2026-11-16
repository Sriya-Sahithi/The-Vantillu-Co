import { adminListOrders } from "@/lib/server/admin";
import { requireAdmin } from "@/lib/server/auth";
import { route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin(req);
  const p = req.nextUrl.searchParams;
  return adminListOrders({ status: p.get("status"), q: p.get("q"), page: Number(p.get("page") ?? 1) || 1 });
});

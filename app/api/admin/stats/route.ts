import { adminStats } from "@/lib/server/admin";
import { requireAdmin } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin(req);
  return { stats: await adminStats(getDb()) };
});

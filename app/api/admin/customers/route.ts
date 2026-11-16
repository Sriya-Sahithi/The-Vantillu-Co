import { adminListCustomers } from "@/lib/server/admin";
import { requireAdmin } from "@/lib/server/auth";
import { route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin(req);
  return { customers: await adminListCustomers(req.nextUrl.searchParams.get("q")) };
});

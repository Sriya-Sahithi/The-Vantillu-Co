import { adminDeletePostcode, adminUpsertPostcode } from "@/lib/server/admin";
import { requireAdmin } from "@/lib/server/auth";
import { badRequest, readJson, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const PUT = route(async (req) => {
  const admin = await requireAdmin(req);
  await adminUpsertPostcode(admin.id, await readJson(req));
  return { ok: true };
});

export const DELETE = route(async (req) => {
  const admin = await requireAdmin(req);
  const pattern = req.nextUrl.searchParams.get("pattern") ?? "";
  if (!/^[1-9]\d{2,5}$/.test(pattern)) throw badRequest("Invalid PIN pattern.");
  await adminDeletePostcode(admin.id, pattern);
  return { ok: true };
});

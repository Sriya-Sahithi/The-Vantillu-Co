import { adminArchiveProduct, adminUpdateProduct } from "@/lib/server/admin";
import { requireAdmin } from "@/lib/server/auth";
import { notFound, readJson, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f-]{36}$/;

export const PATCH = route<Ctx>(async (req, ctx) => {
  const admin = await requireAdmin(req);
  const { id } = await ctx.params;
  if (!UUID.test(id)) throw notFound();
  await adminUpdateProduct(admin.id, id, await readJson(req));
  return { ok: true };
});

/** DELETE archives (soft delete) so historical orders keep their product reference. ?restore=1 un-archives. */
export const DELETE = route<Ctx>(async (req, ctx) => {
  const admin = await requireAdmin(req);
  const { id } = await ctx.params;
  if (!UUID.test(id)) throw notFound();
  await adminArchiveProduct(admin.id, id, req.nextUrl.searchParams.get("restore") !== "1");
  return { ok: true };
});

import { adminCustomerDetail } from "@/lib/server/admin";
import { requireAdmin } from "@/lib/server/auth";
import { notFound, route } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = route<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) throw notFound();
  return { customer: await adminCustomerDetail(id) };
});

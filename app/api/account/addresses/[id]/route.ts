import { requireUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { ApiError, notFound, readJson, route, str } from "@/lib/server/http";
import { validateCheckoutFields } from "@/lib/validation";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f-]{36}$/;

export const PUT = route<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  if (!UUID.test(id)) throw notFound();
  const body = await readJson(req);
  const v = validateCheckoutFields(body);
  if (!v.ok) throw new ApiError(400, "validation_failed", "Please correct the highlighted fields.", v.errors as Record<string, string>);
  const f = v.value;
  await getDb().tx(async (q) => {
    if (body.isDefault === true) await q.query(`update addresses set is_default = false where user_id = $1`, [user.id]);
    // Scoped by user_id: another customer's address id simply matches nothing.
    const res = await q.query(
      `update addresses set label=$3, full_name=$4, mobile=$5, house=$6, street=$7, landmark=$8, city=$9, district=$10, state=$11, pincode=$12,
         is_default = case when $13 then true else is_default end, updated_at = now() where id = $1 and user_id = $2`,
      [id, user.id, str(body.label, 30) || "Home", f.fullName, f.mobile, f.house, f.street, f.landmark || null, f.city, f.district, f.state, f.pincode, body.isDefault === true],
    );
    if (!res.rowCount) throw notFound("Address not found.");
  });
  return { ok: true };
});

export const DELETE = route<Ctx>(async (req, ctx) => {
  const user = await requireUser(req);
  const { id } = await ctx.params;
  if (!UUID.test(id)) throw notFound();
  const res = await getDb().query(`delete from addresses where id = $1 and user_id = $2`, [id, user.id]);
  if (!res.rowCount) throw notFound("Address not found.");
  return { ok: true };
});

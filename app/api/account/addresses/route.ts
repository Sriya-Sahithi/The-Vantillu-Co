import { requireUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { ApiError, readJson, route, str } from "@/lib/server/http";
import { validateCheckoutFields } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  const { rows } = await getDb().query(`select * from addresses where user_id = $1 order by is_default desc, created_at`, [user.id]);
  return { addresses: rows.map(mapAddress) };
});

export const POST = route(async (req) => {
  const user = await requireUser(req);
  const body = await readJson(req);
  const v = validateCheckoutFields(body);
  if (!v.ok) throw new ApiError(400, "validation_failed", "Please correct the highlighted fields.", v.errors as Record<string, string>);
  const f = v.value;
  const db = getDb();
  const id = await db.tx(async (q) => {
    const { rows: count } = await q.query(`select count(*)::int as n from addresses where user_id = $1`, [user.id]);
    if (count[0].n >= 10) throw new ApiError(400, "limit", "You can save up to 10 addresses.");
    const makeDefault = body.isDefault === true || count[0].n === 0;
    if (makeDefault) await q.query(`update addresses set is_default = false where user_id = $1`, [user.id]);
    const { rows } = await q.query(
      `insert into addresses (user_id, label, full_name, mobile, house, street, landmark, city, district, state, pincode, is_default)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning id`,
      [user.id, str(body.label, 30) || "Home", f.fullName, f.mobile, f.house, f.street, f.landmark || null, f.city, f.district, f.state, f.pincode, makeDefault],
    );
    return rows[0].id as string;
  });
  return { id };
});

export function mapAddress(r: Record<string, string | boolean>) {
  return { id: r.id, label: r.label, fullName: r.full_name, mobile: r.mobile, house: r.house, street: r.street, landmark: r.landmark ?? "", city: r.city, district: r.district, state: r.state, pincode: r.pincode, isDefault: r.is_default };
}

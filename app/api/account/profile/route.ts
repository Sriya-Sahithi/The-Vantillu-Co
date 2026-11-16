import { requireUser } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { badRequest, readJson, route, str } from "@/lib/server/http";
import { normalizeMobile } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  const { rows } = await getDb().query(`select full_name, mobile from customer_profiles where user_id = $1`, [user.id]);
  return { profile: { email: user.email, fullName: rows[0]?.full_name ?? "", mobile: rows[0]?.mobile ?? "" } };
});

export const PUT = route(async (req) => {
  const user = await requireUser(req);
  const body = await readJson(req);
  const fullName = str(body.fullName, 80);
  const rawMobile = str(body.mobile, 20);
  const mobile = rawMobile ? normalizeMobile(rawMobile) : null;
  if (rawMobile && !mobile) throw badRequest("Enter a valid 10-digit Indian mobile number.", { mobile: "Enter a valid 10-digit Indian mobile number." });
  await getDb().query(
    `insert into customer_profiles (user_id, full_name, mobile) values ($1, $2, $3)
     on conflict (user_id) do update set full_name = excluded.full_name, mobile = excluded.mobile, updated_at = now()`,
    [user.id, fullName, mobile],
  );
  return { ok: true };
});

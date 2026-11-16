import { NextResponse } from "next/server";
import { consumeOtp, createSession, sessionCookie } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { badRequest, clientIp, readJson, route, str } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/rate-limit";
import { normalizeEmail } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  const body = await readJson(req);
  const email = normalizeEmail(body.email);
  if (!email) throw badRequest("Enter a valid email address.");
  const db = getDb();
  await rateLimit(db, `otp-verify:${clientIp(req)}`, 30, 3600);
  const name = str(body.name, 80);
  const userId = await consumeOtp(db, email, str(body.code, 6));
  if (name) await db.query(`update customer_profiles set full_name = $2, updated_at = now() where user_id = $1 and full_name = ''`, [userId, name]);
  const { token, expiresAt } = await createSession(db, userId);
  const { rows } = await db.query(`select u.email, a.role from users u left join admin_roles a on a.user_id = u.id where u.id = $1`, [userId]);
  const response = NextResponse.json({ user: { email: rows[0].email, isAdmin: Boolean(rows[0].role) } });
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(sessionCookie(token, expiresAt));
  return response;
});

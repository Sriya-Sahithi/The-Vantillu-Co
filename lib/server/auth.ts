import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { hmacHex, randomOtp, randomToken, safeEqual, sha256Hex } from "@/lib/server/crypto";
import { getDb, type Db, type Queryable } from "@/lib/server/db";
import { env, sessionSecret } from "@/lib/server/env";
import { ApiError, forbidden, unauthorized } from "@/lib/server/http";

export const SESSION_COOKIE = "vc_session";
const SESSION_DAYS = 30;
const OTP_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

export type SessionUser = { id: string; email: string; isAdmin: boolean; adminRole: "owner" | "staff" | null };

const hashOtp = (email: string, code: string) => hmacHex(sessionSecret(), `otp:${email}:${code}`);

export async function createOtp(q: Queryable, email: string): Promise<string> {
  const code = randomOtp();
  await q.query(`update auth_otps set consumed_at = now() where email = $1 and consumed_at is null`, [email]);
  await q.query(
    `insert into auth_otps (email, code_hash, expires_at) values ($1, $2, now() + make_interval(mins => $3))`,
    [email, hashOtp(email, code), OTP_MINUTES],
  );
  return code;
}

/**
 * Verifies a one-time code; creates the user on first login; returns the user id.
 * The attempt counter is incremented by a single committed statement BEFORE the comparison, so wrong
 * guesses are always counted (a surrounding transaction that rolls back on error cannot erase them).
 */
export async function consumeOtp(db: Db, email: string, code: string): Promise<string> {
  const invalid = new ApiError(400, "invalid_code", "That code is incorrect or has expired.");
  const { rows } = await db.query(
    `update auth_otps set attempts = attempts + 1
     where id = (select id from auth_otps where email = $1 and consumed_at is null and expires_at > now() order by created_at desc limit 1)
       and attempts < $2
     returning id, code_hash`,
    [email, OTP_MAX_ATTEMPTS],
  );
  const otp = rows[0];
  if (!otp) {
    const { rows: locked } = await db.query(
      `select 1 from auth_otps where email = $1 and consumed_at is null and expires_at > now() and attempts >= $2 limit 1`,
      [email, OTP_MAX_ATTEMPTS],
    );
    if (locked[0]) throw new ApiError(429, "rate_limited", "Too many wrong attempts. Please request a new code.");
    throw invalid;
  }
  if (!/^\d{6}$/.test(code) || !safeEqual(otp.code_hash, hashOtp(email, code))) throw invalid;

  return db.tx(async (q) => {
    const used = await q.query(`update auth_otps set consumed_at = now() where id = $1 and consumed_at is null`, [otp.id]);
    if (!used.rowCount) throw invalid;
    const { rows: users } = await q.query(
      `insert into users (email, last_login_at) values ($1, now())
       on conflict (email) do update set last_login_at = now() returning id`,
      [email],
    );
    const userId = users[0].id as string;
    await q.query(`insert into customer_profiles (user_id) values ($1) on conflict do nothing`, [userId]);
    if (env.adminBootstrapEmails.includes(email)) {
      await q.query(`insert into admin_roles (user_id, role) values ($1, 'owner') on conflict do nothing`, [userId]);
    }
    // Guest orders placed with this (now verified) email become part of the account.
    await q.query(`update orders set user_id = $1 where user_id is null and lower(email) = $2`, [userId, email]);
    return userId;
  });
}

export async function createSession(q: Queryable, userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await q.query(`insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)`, [sha256Hex(token), userId, expiresAt]);
  await q.query(`delete from sessions where expires_at < now()`);
  return { token, expiresAt };
}

export function sessionCookie(token: string, expiresAt: Date) {
  return { name: SESSION_COOKIE, value: token, httpOnly: true, secure: env.isProduction, sameSite: "lax" as const, path: "/", expires: expiresAt };
}

async function userFromToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const { rows } = await getDb().query(
    `select u.id, u.email, a.role from sessions s
     join users u on u.id = s.user_id
     left join admin_roles a on a.user_id = u.id
     where s.token_hash = $1 and s.expires_at > now()`,
    [sha256Hex(token)],
  );
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, email: row.email, isAdmin: Boolean(row.role), adminRole: row.role ?? null };
}

/** Current user for route handlers (reads cookie from the request). */
export function getUserFromRequest(req: NextRequest): Promise<SessionUser | null> {
  return userFromToken(req.cookies.get(SESSION_COOKIE)?.value);
}

/** Current user for server components. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  return userFromToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireUser(req: NextRequest): Promise<SessionUser> {
  const user = await getUserFromRequest(req);
  if (!user) throw unauthorized();
  return user;
}

/** Server-side admin gate. Always re-reads the role from the database. */
export async function requireAdmin(req: NextRequest, options: { owner?: boolean } = {}): Promise<SessionUser> {
  const user = await getUserFromRequest(req);
  if (!user) throw unauthorized();
  if (!user.isAdmin) throw forbidden("Admin access required.");
  if (user.adminRole !== "owner") throw forbidden("Owner access required.");
  return user;
}

export async function destroySession(token: string | undefined) {
  if (token) await getDb().query(`delete from sessions where token_hash = $1`, [sha256Hex(token)]);
}

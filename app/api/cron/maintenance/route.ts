import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/server/crypto";
import { env } from "@/lib/server/env";
import { flushOutbox } from "@/lib/server/notifications";
import { expireStaleOrders } from "@/lib/server/orders";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Releases expired holds and retries emails. */
export async function GET(req: Request) {
  const secret = env.cronSecret;
  const given = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(given, `Bearer ${secret}`)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const expired = await expireStaleOrders(50);
  const emails = await flushOutbox(50);
  await getDb().query(`delete from rate_limits where window_start < now() - interval '2 days'`);
  await getDb().query(`delete from auth_otps where expires_at < now() - interval '1 day'`);
  return NextResponse.json({ expired, emails });
}

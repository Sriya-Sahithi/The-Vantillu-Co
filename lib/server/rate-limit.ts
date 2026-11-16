import type { Queryable } from "@/lib/server/db";
import { ApiError } from "@/lib/server/http";

/**
 * Fixed-window counter in Postgres (serverless instances do not share memory).
 * Throws 429 when the limit for `key` is exceeded in the current window.
 */
export async function rateLimit(q: Queryable, key: string, limit: number, windowSeconds: number): Promise<void> {
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const { rows } = await q.query<{ count: number }>(
    `insert into rate_limits (key, window_start, count) values ($1, to_timestamp($2), 1)
     on conflict (key, window_start) do update set count = rate_limits.count + 1
     returning count`,
    [key, windowStart],
  );
  if (rows[0].count > limit) {
    throw new ApiError(429, "rate_limited", "Too many attempts. Please wait a moment and try again.");
  }
}

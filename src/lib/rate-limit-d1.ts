import { getDb } from "@/lib/d1";

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

/** Rate limit durable via D1 (survit aux cold starts Worker). */
export async function checkRateLimitD1(
  key: string,
  max = Number(process.env.RATE_LIMIT_MAX ?? 30),
  windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 3_600_000)
): Promise<RateLimitResult> {
  const db = getDb();
  const now = Date.now();
  const row = await db
    .prepare("SELECT count, reset_at FROM rate_limits WHERE bucket_key = ?")
    .bind(key)
    .first<{ count: number; reset_at: number }>();

  if (!row || now > row.reset_at) {
    const resetAt = now + windowMs;
    await db
      .prepare(
        `INSERT INTO rate_limits (bucket_key, count, reset_at)
         VALUES (?, 1, ?)
         ON CONFLICT(bucket_key) DO UPDATE SET count = 1, reset_at = excluded.reset_at`
      )
      .bind(key, resetAt)
      .run();
    return { ok: true, remaining: max - 1, resetAt };
  }

  if (row.count >= max) {
    return { ok: false, remaining: 0, resetAt: row.reset_at };
  }

  const next = row.count + 1;
  await db
    .prepare("UPDATE rate_limits SET count = ? WHERE bucket_key = ?")
    .bind(next, key)
    .run();

  return { ok: true, remaining: max - next, resetAt: row.reset_at };
}

import { getDb } from "@/lib/d1";

const TTL_MS = 5 * 60 * 1000;

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const db = getDb();
    const row = await db
      .prepare("SELECT payload, expires_at FROM market_cache WHERE cache_key = ?")
      .bind(key)
      .first<{ payload: string; expires_at: number }>();
    if (!row || row.expires_at <= Date.now()) return null;
    return JSON.parse(row.payload) as T;
  } catch {
    return null;
  }
}

export async function setCached(key: string, value: unknown, ttlMs = TTL_MS): Promise<void> {
  try {
    const db = getDb();
    const now = Date.now();
    await db
      .prepare(
        `INSERT INTO market_cache (cache_key, payload, expires_at, created_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(cache_key) DO UPDATE SET
           payload = excluded.payload,
           expires_at = excluded.expires_at`
      )
      .bind(key, JSON.stringify(value), now + ttlMs, now)
      .run();
  } catch {
    // cache best-effort
  }
}

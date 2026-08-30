import { checkRateLimitD1 } from "@/lib/rate-limit-d1";

const store = new Map<string, { count: number; resetAt: number }>();

function checkRateLimitMemory(
  ip: string,
  max = Number(process.env.RATE_LIMIT_MAX ?? 30),
  windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 3_600_000)
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, resetAt: now + windowMs };
  }

  if (entry.count >= max) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { ok: true, remaining: max - entry.count, resetAt: entry.resetAt };
}

/** Rate limit : D1 en prod, mémoire en secours (dev local sans D1). */
export async function checkRateLimit(
  key: string,
  max = Number(process.env.RATE_LIMIT_MAX ?? 30),
  windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 3_600_000)
): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  try {
    return await checkRateLimitD1(key, max, windowMs);
  } catch {
    return checkRateLimitMemory(key, max, windowMs);
  }
}

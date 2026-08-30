import type { MarketSnapshot } from "@/lib/market/types";
import { getCached, setCached } from "@/lib/market/cache";

const FETCH_INIT: RequestInit = {
  headers: { Accept: "application/json", "User-Agent": "KlirIA/1.0 (+https://klirline.io)" },
};

/** Taux forex via Frankfurter (ECB, gratuit, sans clé). */
export async function fetchForexFromFrankfurter(
  from: string,
  to: string
): Promise<MarketSnapshot | null> {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  const cacheKey = `frankfurter:${f}:${t}`;
  const cached = await getCached<MarketSnapshot>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://api.frankfurter.app/latest?from=${f}&to=${t}`;
    const res = await fetch(url, FETCH_INIT);
    if (!res.ok) return null;

    const data = (await res.json()) as { rates?: Record<string, number> };
    const rate = data.rates?.[t];
    if (!rate) return null;

    const snapshot: MarketSnapshot = {
      assetClass: "forex",
      coinId: `${f}${t}`,
      symbol: `${f}/${t}`,
      name: `${f}/${t}`,
      priceUsd: rate,
      currency: t,
      change24hPct: null,
      change7dPct: null,
      change30dPct: null,
      marketCapUsd: null,
      volume24hUsd: null,
      high24hUsd: null,
      low24hUsd: null,
      fearGreed: null,
      source: "frankfurter",
      fetchedAt: Date.now(),
    };

    await setCached(cacheKey, snapshot, 15 * 60 * 1000);
    return snapshot;
  } catch {
    return null;
  }
}

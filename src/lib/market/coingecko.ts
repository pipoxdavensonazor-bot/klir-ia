import type { FearGreed, MarketSnapshot } from "@/lib/market/types";
import { getCached, setCached } from "@/lib/market/cache";
import { coinIdToSymbol } from "@/lib/market/symbols";
import { fetchCryptoFromBinance } from "@/lib/market/binance-public";
import { fetchCryptoFromCoinbase } from "@/lib/market/coinbase-public";

const MARKET_FETCH_INIT: RequestInit = {
  headers: {
    Accept: "application/json",
    "User-Agent": "KlirIA/1.0 (+https://klirline.io)",
  },
};

export async function fetchFearGreed(): Promise<FearGreed | null> {
  const cached = await getCached<FearGreed>("fng:latest");
  if (cached) return cached;

  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1", MARKET_FETCH_INIT);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: { value?: string; value_classification?: string }[];
    };
    const row = data.data?.[0];
    if (!row?.value) return null;
    const out: FearGreed = {
      value: Number(row.value),
      label: row.value_classification ?? "Unknown",
    };
    await setCached("fng:latest", out, 15 * 60 * 1000);
    return out;
  } catch {
    return null;
  }
}

export async function fetchCoinSnapshot(coinId: string): Promise<MarketSnapshot | null> {
  const cacheKey = `coin:${coinId}`;
  const cached = await getCached<MarketSnapshot>(cacheKey);
  if (cached) return cached;

  try {
    const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
    url.searchParams.set("vs_currency", "usd");
    url.searchParams.set("ids", coinId);
    url.searchParams.set("sparkline", "false");
    url.searchParams.set("price_change_percentage", "24h,7d,30d");

    const res = await fetch(url.toString(), MARKET_FETCH_INIT);
    if (!res.ok) return fetchCryptoFromCoinbase(coinId) ?? fetchCryptoFromBinance(coinId);

    const rows = (await res.json()) as {
      id: string;
      symbol: string;
      name: string;
      current_price: number;
      market_cap: number;
      total_volume: number;
      high_24h: number;
      low_24h: number;
      price_change_percentage_24h?: number;
      price_change_percentage_7d_in_currency?: number;
      price_change_percentage_30d_in_currency?: number;
    }[];

    const row = rows[0];
    if (!row) return (await fetchCryptoFromCoinbase(coinId)) ?? fetchCryptoFromBinance(coinId);

    const fearGreed = await fetchFearGreed();

    const snapshot: MarketSnapshot = {
      assetClass: "crypto",
      coinId: row.id,
      symbol: row.symbol?.toUpperCase() || coinIdToSymbol(coinId),
      name: row.name,
      priceUsd: row.current_price,
      currency: "USD",
      change24hPct: row.price_change_percentage_24h ?? null,
      change7dPct: row.price_change_percentage_7d_in_currency ?? null,
      change30dPct: row.price_change_percentage_30d_in_currency ?? null,
      marketCapUsd: row.market_cap ?? null,
      volume24hUsd: row.total_volume ?? null,
      high24hUsd: row.high_24h ?? null,
      low24hUsd: row.low_24h ?? null,
      fearGreed,
      source: "coingecko",
      fetchedAt: Date.now(),
    };

    await setCached(cacheKey, snapshot);
    return snapshot;
  } catch {
    return (await fetchCryptoFromCoinbase(coinId)) ?? fetchCryptoFromBinance(coinId);
  }
}

import type { MarketSnapshot } from "@/lib/market/types";
import { getCached, setCached } from "@/lib/market/cache";

const PAIR_MAP: Record<string, string> = {
  bitcoin: "BTC-USD",
  ethereum: "ETH-USD",
  solana: "SOL-USD",
  ripple: "XRP-USD",
  cardano: "ADA-USD",
  dogecoin: "DOGE-USD",
  binancecoin: "BNB-USD",
  "avalanche-2": "AVAX-USD",
  chainlink: "LINK-USD",
  polkadot: "DOT-USD",
  "matic-network": "MATIC-USD",
  litecoin: "LTC-USD",
  tron: "TRX-USD",
};

const FETCH_INIT: RequestInit = {
  headers: { Accept: "application/json", "User-Agent": "KlirIA/1.0 (+https://klirline.io)" },
};

/** Prix crypto via API publique Coinbase (sans clé, compatible Worker US). */
export async function fetchCryptoFromCoinbase(coinId: string): Promise<MarketSnapshot | null> {
  const pair = PAIR_MAP[coinId];
  if (!pair) return null;

  const cacheKey = `coinbase:${coinId}`;
  const cached = await getCached<MarketSnapshot>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://api.coinbase.com/v2/prices/${pair}/spot`;
    const res = await fetch(url, FETCH_INIT);
    if (!res.ok) return null;

    const data = (await res.json()) as { data?: { amount?: string; base?: string; currency?: string } };
    const amount = data.data?.amount;
    if (!amount) return null;

    const snapshot: MarketSnapshot = {
      assetClass: "crypto",
      coinId,
      symbol: data.data?.base || pair.split("-")[0],
      name: coinId,
      priceUsd: Number(amount),
      currency: "USD",
      change24hPct: null,
      change7dPct: null,
      change30dPct: null,
      marketCapUsd: null,
      volume24hUsd: null,
      high24hUsd: null,
      low24hUsd: null,
      fearGreed: null,
      source: "coinbase",
      fetchedAt: Date.now(),
    };

    await setCached(cacheKey, snapshot, 3 * 60 * 1000);
    return snapshot;
  } catch {
    return null;
  }
}

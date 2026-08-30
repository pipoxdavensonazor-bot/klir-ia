import type { MarketSnapshot } from "@/lib/market/types";
import { getCached, setCached } from "@/lib/market/cache";

const SYMBOL_MAP: Record<string, string> = {
  bitcoin: "BTCUSDT",
  ethereum: "ETHUSDT",
  solana: "SOLUSDT",
  ripple: "XRPUSDT",
  cardano: "ADAUSDT",
  dogecoin: "DOGEUSDT",
  tether: "USDTUSDT",
  binancecoin: "BNBUSDT",
  "avalanche-2": "AVAXUSDT",
  chainlink: "LINKUSDT",
  polkadot: "DOTUSDT",
  "matic-network": "MATICUSDT",
  litecoin: "LTCUSDT",
  tron: "TRXUSDT",
};

const FETCH_INIT: RequestInit = {
  headers: { Accept: "application/json", "User-Agent": "KlirIA/1.0 (+https://klirline.io)" },
};

/** Prix crypto via API publique Binance (sans clé). */
export async function fetchCryptoFromBinance(coinId: string): Promise<MarketSnapshot | null> {
  const pair = SYMBOL_MAP[coinId];
  if (!pair) return null;

  const cacheKey = `binance:${coinId}`;
  const cached = await getCached<MarketSnapshot>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`;
    const res = await fetch(url, FETCH_INIT);
    if (!res.ok) return null;

    const row = (await res.json()) as {
      symbol?: string;
      lastPrice?: string;
      priceChangePercent?: string;
      highPrice?: string;
      lowPrice?: string;
      volume?: string;
      quoteVolume?: string;
    };

    if (!row.lastPrice) return null;

    const snapshot: MarketSnapshot = {
      assetClass: "crypto",
      coinId,
      symbol: pair.replace("USDT", ""),
      name: coinId,
      priceUsd: Number(row.lastPrice),
      currency: "USD",
      change24hPct: row.priceChangePercent ? Number(row.priceChangePercent) : null,
      change7dPct: null,
      change30dPct: null,
      marketCapUsd: null,
      volume24hUsd: row.quoteVolume ? Number(row.quoteVolume) : null,
      high24hUsd: row.highPrice ? Number(row.highPrice) : null,
      low24hUsd: row.lowPrice ? Number(row.lowPrice) : null,
      fearGreed: null,
      source: "binance",
      fetchedAt: Date.now(),
    };

    await setCached(cacheKey, snapshot, 3 * 60 * 1000);
    return snapshot;
  } catch {
    return null;
  }
}

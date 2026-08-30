import { getCached, setCached } from "@/lib/market/cache";
import type { MarketSnapshot } from "@/lib/market/types";
import { readEnv } from "@/lib/env";
import { fetchForexFromFrankfurter } from "@/lib/market/frankfurter";

function apiKey(): string | null {
  const key = readEnv("ALPHA_VANTAGE_API_KEY");
  return key?.trim() || null;
}

async function avFetch(params: Record<string, string>): Promise<Record<string, unknown> | null> {
  const key = apiKey();
  if (!key) return null;

  const url = new URL("https://www.alphavantage.co/query");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("apikey", key);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "KlirIA/1.0 (+https://klirline.io)",
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Record<string, unknown>;
  if (data.Note || data.Information) return null;
  return data;
}

function parsePct(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(String(raw).replace("%", "").trim());
  return Number.isFinite(n) ? n : null;
}

export async function fetchEquitySnapshot(symbol: string): Promise<MarketSnapshot | null> {
  const sym = symbol.toUpperCase();
  const cacheKey = `equity:${sym}`;
  const cached = await getCached<MarketSnapshot>(cacheKey);
  if (cached) return cached;

  const data = await avFetch({ function: "GLOBAL_QUOTE", symbol: sym });
  const quote = data?.["Global Quote"] as Record<string, string> | undefined;
  if (!quote?.["05. price"]) return null;

  const snapshot: MarketSnapshot = {
    assetClass: "equity",
    coinId: sym,
    symbol: sym,
    name: sym,
    priceUsd: Number(quote["05. price"]),
    currency: "USD",
    change24hPct: parsePct(quote["10. change percent"]),
    change7dPct: null,
    change30dPct: null,
    marketCapUsd: null,
    volume24hUsd: quote["06. volume"] ? Number(quote["06. volume"]) : null,
    high24hUsd: quote["03. high"] ? Number(quote["03. high"]) : null,
    low24hUsd: quote["04. low"] ? Number(quote["04. low"]) : null,
    fearGreed: null,
    source: "alphavantage",
    fetchedAt: Date.now(),
  };

  await setCached(cacheKey, snapshot, 10 * 60 * 1000);
  return snapshot;
}

export async function fetchForexSnapshot(from: string, to: string): Promise<MarketSnapshot | null> {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  const cacheKey = `forex:${f}:${t}`;
  const cached = await getCached<MarketSnapshot>(cacheKey);
  if (cached) return cached;

  const data = await avFetch({
    function: "CURRENCY_EXCHANGE_RATE",
    from_currency: f,
    to_currency: t,
  });

  const row = data?.["Realtime Currency Exchange Rate"] as Record<string, string> | undefined;
  if (!row?.["5. Exchange Rate"]) {
    return fetchForexFromFrankfurter(f, t);
  }

  const rate = Number(row["5. Exchange Rate"]);
  const bid = row["8. Bid Price"] ? Number(row["8. Bid Price"]) : null;
  const ask = row["9. Ask Price"] ? Number(row["9. Ask Price"]) : null;

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
    high24hUsd: ask,
    low24hUsd: bid,
    fearGreed: null,
    source: "alphavantage",
    fetchedAt: Date.now(),
  };

  await setCached(cacheKey, snapshot, 10 * 60 * 1000);
  return snapshot;
}

import { fetchEquitySnapshot, fetchForexSnapshot } from "@/lib/market/alphavantage";
import { fetchCoinSnapshot } from "@/lib/market/coingecko";
import type { AssetRef, MarketSnapshot } from "@/lib/market/types";

export async function fetchAssetSnapshot(ref: AssetRef): Promise<MarketSnapshot | null> {
  if (ref.assetClass === "crypto") return fetchCoinSnapshot(ref.id);
  if (ref.assetClass === "forex") return fetchForexSnapshot(ref.from, ref.to);
  return fetchEquitySnapshot(ref.symbol);
}

export async function fetchAssetSnapshots(refs: AssetRef[]): Promise<MarketSnapshot[]> {
  const unique: AssetRef[] = [];
  const seen = new Set<string>();
  for (const ref of refs) {
    const key =
      ref.assetClass === "crypto"
        ? ref.id
        : ref.assetClass === "forex"
          ? `${ref.from}${ref.to}`
          : ref.symbol;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(ref);
  }

  const results = await Promise.all(unique.slice(0, 3).map((r) => fetchAssetSnapshot(r)));
  return results.filter((r): r is MarketSnapshot => Boolean(r));
}

export function formatSnapshotForPrompt(s: MarketSnapshot): string {
  const pct = (n: number | null) => (n === null ? "n/d" : `${n.toFixed(2)}%`);
  const num = (n: number | null) =>
    n === null ? "n/d" : n.toLocaleString("en-US", { maximumFractionDigits: 4 });

  const classLabel =
    s.assetClass === "crypto" ? "Crypto" : s.assetClass === "forex" ? "Forex" : "Action";

  const lines = [
    `[${classLabel}] ${s.name} (${s.symbol}) — source ${s.source}`,
    `Prix : ${num(s.priceUsd)} ${s.currency}`,
  ];

  if (s.assetClass === "crypto") {
    lines.push(
      `Var. 24h / 7j / 30j : ${pct(s.change24hPct)} / ${pct(s.change7dPct)} / ${pct(s.change30dPct)}`,
      `Market cap : $${num(s.marketCapUsd)} · Volume 24h : $${num(s.volume24hUsd)}`,
      `Range 24h : $${num(s.low24hUsd)} – $${num(s.high24hUsd)}`
    );
    if (s.fearGreed) {
      lines.push(`Fear & Greed : ${s.fearGreed.value}/100 (${s.fearGreed.label})`);
    }
  } else if (s.assetClass === "equity") {
    lines.push(`Var. 24h : ${pct(s.change24hPct)}`);
    if (s.volume24hUsd) lines.push(`Volume : ${num(s.volume24hUsd)}`);
    if (s.high24hUsd && s.low24hUsd) {
      lines.push(`Range jour : ${num(s.low24hUsd)} – ${num(s.high24hUsd)}`);
    }
  } else {
    if (s.low24hUsd && s.high24hUsd) {
      lines.push(`Bid / Ask : ${num(s.low24hUsd)} / ${num(s.high24hUsd)}`);
    }
  }

  return lines.join("\n");
}

/** @deprecated use fetchAssetSnapshots */
export async function fetchSnapshots(coinIds: string[]): Promise<MarketSnapshot[]> {
  return fetchAssetSnapshots(coinIds.map((id) => ({ assetClass: "crypto", id })));
}

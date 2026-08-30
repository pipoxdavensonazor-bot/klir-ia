/** Résolution symboles crypto / forex / actions */

import type { AssetRef } from "@/lib/market/types";

const CRYPTO_ALIASES: Record<string, string> = {
  btc: "bitcoin",
  bitcoin: "bitcoin",
  eth: "ethereum",
  ethereum: "ethereum",
  sol: "solana",
  solana: "solana",
  xrp: "ripple",
  ripple: "ripple",
  ada: "cardano",
  cardano: "cardano",
  doge: "dogecoin",
  dogecoin: "dogecoin",
  usdt: "tether",
  bnb: "binancecoin",
  avax: "avalanche-2",
  link: "chainlink",
  dot: "polkadot",
  matic: "matic-network",
  pol: "matic-network",
  ltc: "litecoin",
  trx: "tron",
};

const FOREX_PAIRS: Record<string, [string, string]> = {
  eurusd: ["EUR", "USD"],
  gbpusd: ["GBP", "USD"],
  usdjpy: ["USD", "JPY"],
  usdcad: ["USD", "CAD"],
  usdchf: ["USD", "CHF"],
  audusd: ["AUD", "USD"],
  nzdusd: ["NZD", "USD"],
  usdhtg: ["USD", "HTG"],
  eurhtg: ["EUR", "HTG"],
};

const EQUITY_TICKERS = new Set([
  "AAPL",
  "MSFT",
  "GOOGL",
  "GOOG",
  "AMZN",
  "TSLA",
  "NVDA",
  "META",
  "NFLX",
  "SPY",
  "QQQ",
  "DIA",
  "IBM",
  "JPM",
  "V",
  "DIS",
  "BA",
  "XOM",
]);

export function resolveCoinId(input: string): string | null {
  const ref = resolveAsset(input);
  return ref?.assetClass === "crypto" ? ref.id : null;
}

export function resolveAsset(input: string): AssetRef | null {
  const raw = input.trim().toUpperCase().replace(/^\$/, "");
  if (!raw) return null;

  const cryptoKey = raw.toLowerCase();
  if (CRYPTO_ALIASES[cryptoKey]) {
    return { assetClass: "crypto", id: CRYPTO_ALIASES[cryptoKey] };
  }

  const forexKey = raw.replace(/[/\-_\s]/g, "").toLowerCase();
  const pair = FOREX_PAIRS[forexKey];
  if (pair) {
    return { assetClass: "forex", from: pair[0], to: pair[1] };
  }

  if (/^[A-Z]{6}$/.test(raw)) {
    const p = FOREX_PAIRS[raw.toLowerCase()];
    if (p) return { assetClass: "forex", from: p[0], to: p[1] };
  }

  if (/^[A-Z]{1,5}$/.test(raw) && EQUITY_TICKERS.has(raw)) {
    return { assetClass: "equity", symbol: raw };
  }

  return null;
}

export function extractSymbolsFromText(text: string): string[] {
  return extractAssetsFromText(text)
    .filter((a): a is AssetRef & { assetClass: "crypto" } => a.assetClass === "crypto")
    .map((a) => a.id);
}

export function extractAssetsFromText(text: string): AssetRef[] {
  const lower = text.toLowerCase();
  const found: AssetRef[] = [];
  const seen = new Set<string>();

  function push(ref: AssetRef) {
    const key =
      ref.assetClass === "crypto"
        ? `c:${ref.id}`
        : ref.assetClass === "forex"
          ? `f:${ref.from}${ref.to}`
          : `e:${ref.symbol}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push(ref);
  }

  for (const alias of Object.keys(CRYPTO_ALIASES)) {
    const re =
      alias.length <= 3
        ? new RegExp(`\\b\\$?${alias}\\b`, "i")
        : new RegExp(`\\b${alias}\\b`, "i");
    if (re.test(lower)) push({ assetClass: "crypto", id: CRYPTO_ALIASES[alias] });
  }

  for (const [key, pair] of Object.entries(FOREX_PAIRS)) {
    const formatted = `${pair[0]}/${pair[1]}`.toLowerCase();
    if (lower.includes(key) || lower.includes(formatted) || lower.includes(`${pair[0].toLowerCase()}/${pair[1].toLowerCase()}`)) {
      push({ assetClass: "forex", from: pair[0], to: pair[1] });
    }
  }

  if (/usd\s*\/\s*htg|dollar.*gourde|gourde.*usd/.test(lower)) {
    push({ assetClass: "forex", from: "USD", to: "HTG" });
  }

  for (const ticker of EQUITY_TICKERS) {
    const re = new RegExp(`\\b\\$?${ticker}\\b`, "i");
    if (re.test(text)) push({ assetClass: "equity", symbol: ticker });
  }

  if (/action|bourse|stock|nasdaq|s&p|sp500/.test(lower)) {
    for (const t of ["AAPL", "MSFT", "TSLA", "SPY"]) {
      if (!seen.has(`e:${t}`)) {
        push({ assetClass: "equity", symbol: t });
        break;
      }
    }
  }

  if (/crypto|cryptomonnaie|bitcoin/.test(lower) && ![...seen].some((k) => k.startsWith("c:"))) {
    push({ assetClass: "crypto", id: "bitcoin" });
  }

  return found.slice(0, 3);
}

export function coinIdToSymbol(coinId: string): string {
  const entry = Object.entries(CRYPTO_ALIASES).find(([, id]) => id === coinId);
  if (entry) return entry[0].toUpperCase().slice(0, 5);
  return coinId.slice(0, 4).toUpperCase();
}

export function assetRefLabel(ref: AssetRef): string {
  if (ref.assetClass === "crypto") return ref.id;
  if (ref.assetClass === "forex") return `${ref.from}/${ref.to}`;
  return ref.symbol;
}

/** Types et constantes — analyse marché Klir IA */

export const TRADING_DISCLAIMER_FR =
  "⚠️ Avertissement : contenu informatif uniquement — pas un conseil en investissement. Les marchés comportent un risque de perte en capital. Consultez un conseiller agréé avant toute décision financière.";

export type AssetClass = "crypto" | "forex" | "equity";

export type AssetRef =
  | { assetClass: "crypto"; id: string }
  | { assetClass: "forex"; from: string; to: string }
  | { assetClass: "equity"; symbol: string };

export type FearGreed = {
  value: number;
  label: string;
};

export type MarketSnapshot = {
  assetClass: AssetClass;
  /** Identifiant interne (coin id, paire forex, ticker) */
  coinId: string;
  symbol: string;
  name: string;
  priceUsd: number;
  currency: string;
  change24hPct: number | null;
  change7dPct: number | null;
  change30dPct: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  high24hUsd: number | null;
  low24hUsd: number | null;
  fearGreed: FearGreed | null;
  source: "coingecko" | "alphavantage" | "binance" | "frankfurter" | "coinbase";
  fetchedAt: number;
};

export type MarketScenario = "bullish" | "neutral" | "bearish";

export type MarketAnalysisResult = {
  symbol: string;
  snapshot: MarketSnapshot;
  summary: string;
  scenarios: Record<MarketScenario, string>;
  disclaimer: string;
  provider?: string;
};

export type ExchangeConnectionStatus = {
  id: "binance" | "etoro" | "alphavantage" | "coingecko";
  label: string;
  available: boolean;
  mode: "read_only" | "public" | "api_key";
  note: string;
};

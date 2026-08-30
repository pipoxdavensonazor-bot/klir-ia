import type { AssetRef } from "@/lib/market/types";
import { resolveAsset } from "@/lib/market/symbols";

const CRYPTO_TV: Record<string, string> = {
  bitcoin: "BINANCE:BTCUSDT",
  ethereum: "BINANCE:ETHUSDT",
  solana: "BINANCE:SOLUSDT",
  ripple: "BINANCE:XRPUSDT",
  cardano: "BINANCE:ADAUSDT",
  dogecoin: "BINANCE:DOGEUSDT",
  binancecoin: "BINANCE:BNBUSDT",
  "avalanche-2": "BINANCE:AVAXUSDT",
  chainlink: "BINANCE:LINKUSDT",
  polkadot: "BINANCE:DOTUSDT",
  "matic-network": "BINANCE:MATICUSDT",
  litecoin: "BINANCE:LTCUSDT",
  tron: "BINANCE:TRXUSDT",
};

const EQUITY_TV: Record<string, string> = {
  AAPL: "NASDAQ:AAPL",
  MSFT: "NASDAQ:MSFT",
  GOOGL: "NASDAQ:GOOGL",
  GOOG: "NASDAQ:GOOG",
  AMZN: "NASDAQ:AMZN",
  TSLA: "NASDAQ:TSLA",
  NVDA: "NASDAQ:NVDA",
  META: "NASDAQ:META",
  NFLX: "NASDAQ:NFLX",
  SPY: "AMEX:SPY",
  QQQ: "NASDAQ:QQQ",
  DIA: "AMEX:DIA",
  IBM: "NYSE:IBM",
  JPM: "NYSE:JPM",
  V: "NYSE:V",
  DIS: "NYSE:DIS",
  BA: "NYSE:BA",
  XOM: "NYSE:XOM",
};

export function assetRefToTradingViewSymbol(ref: AssetRef): string {
  if (ref.assetClass === "crypto") {
    return CRYPTO_TV[ref.id] ?? "BINANCE:BTCUSDT";
  }
  if (ref.assetClass === "forex") {
    return `FX:${ref.from}${ref.to}`;
  }
  return EQUITY_TV[ref.symbol] ?? `NASDAQ:${ref.symbol}`;
}

export function symbolToTradingViewSymbol(symbol: string): string {
  const ref = resolveAsset(symbol);
  if (ref) return assetRefToTradingViewSymbol(ref);
  const upper = symbol.trim().toUpperCase();
  if (upper.includes(":")) return upper;
  if (upper === "BTC" || upper === "BITCOIN") return "BINANCE:BTCUSDT";
  return "BINANCE:BTCUSDT";
}

export function snapshotToTradingViewSymbol(snapshot: {
  symbol: string;
  assetClass?: string;
  name?: string;
}): string {
  return symbolToTradingViewSymbol(snapshot.symbol);
}

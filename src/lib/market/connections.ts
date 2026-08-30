import { readEnv } from "@/lib/env";
import type { ExchangeConnectionStatus } from "@/lib/market/types";

export function alphavantageConfigured(): boolean {
  return Boolean(readEnv("ALPHA_VANTAGE_API_KEY"));
}

export function binanceApiKeyConfigured(): boolean {
  return Boolean(readEnv("BINANCE_API_KEY"));
}

export function binanceReadOnlyConfigured(): boolean {
  return Boolean(readEnv("BINANCE_API_KEY") && readEnv("BINANCE_API_SECRET"));
}

function binanceNote(): string {
  const hasKey = binanceApiKeyConfigured();
  const hasSecret = Boolean(readEnv("BINANCE_API_SECRET"));
  if (hasKey && hasSecret) return "Clés configurées — sync portefeuille bientôt";
  if (hasKey) return "API Key OK — ajoutez BINANCE_API_SECRET (lecture seule, sans retrait)";
  return "BINANCE_API_KEY + BINANCE_API_SECRET (lecture seule, sans retrait)";
}

export function etoroConfigured(): boolean {
  return Boolean(
    readEnv("ETORO_ACCESS_TOKEN") ||
      (readEnv("ETORO_API_KEY") && readEnv("ETORO_USER_KEY"))
  );
}

/** État des connexions marché (lecture seule / clés API). */
export function listMarketConnections(): ExchangeConnectionStatus[] {
  return [
    {
      id: "coingecko",
      label: "CoinGecko",
      available: true,
      mode: "public",
      note: "Crypto — prix publics actifs",
    },
    {
      id: "alphavantage",
      label: "Alpha Vantage",
      available: alphavantageConfigured(),
      mode: "api_key",
      note: alphavantageConfigured()
        ? "Forex + actions US actifs"
        : "Ajoutez ALPHA_VANTAGE_API_KEY pour forex/actions",
    },
    {
      id: "binance",
      label: "Binance (lecture seule)",
      available: binanceReadOnlyConfigured(),
      mode: "read_only",
      note: binanceNote(),
    },
    {
      id: "etoro",
      label: "eToro (lecture seule)",
      available: etoroConfigured(),
      mode: "read_only",
      note: etoroConfigured()
        ? "Clés configurées — sync portefeuille bientôt"
        : "ETORO_API_KEY + ETORO_USER_KEY sur api-portal.etoro.com (lecture seule)",
    },
  ];
}

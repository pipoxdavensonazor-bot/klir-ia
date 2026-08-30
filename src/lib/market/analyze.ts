import { chat } from "@/lib/ai/chat-provider";
import { fetchAssetSnapshot, formatSnapshotForPrompt } from "@/lib/market/fetch";
import { resolveAsset } from "@/lib/market/symbols";
import type { MarketAnalysisResult, MarketScenario } from "@/lib/market/types";
import { TRADING_DISCLAIMER_FR } from "@/lib/market/types";

function parseSections(content: string): {
  summary: string;
  scenarios: Record<MarketScenario, string>;
} {
  const scenarios: Record<MarketScenario, string> = {
    bullish: "",
    neutral: "",
    bearish: "",
  };
  let summary = content.trim();

  const bull = content.match(/(?:##?\s*)?(?:Haussier|Bullish|Scénario haussier)[:\s]*([\s\S]*?)(?=##?\s*(?:Neutre|Neutral|Baissier|Bearish)|$)/i);
  const neut = content.match(/(?:##?\s*)?(?:Neutre|Neutral|Scénario neutre)[:\s]*([\s\S]*?)(?=##?\s*(?:Baissier|Bearish|Haussier|Bullish)|$)/i);
  const bear = content.match(/(?:##?\s*)?(?:Baissier|Bearish|Scénario baissier)[:\s]*([\s\S]*?)$/i);

  if (bull || neut || bear) {
    if (bull) scenarios.bullish = bull[1].trim();
    if (neut) scenarios.neutral = neut[1].trim();
    if (bear) scenarios.bearish = bear[1].trim();
    const sumMatch = content.match(/(?:##?\s*)?(?:Résumé|Summary)[:\s]*([\s\S]*?)(?=##?\s*(?:Haussier|Bullish|Neutre|Scénario)|$)/i);
    if (sumMatch) summary = sumMatch[1].trim();
  }

  return { summary, scenarios };
}

function analystRole(assetClass: "crypto" | "forex" | "equity"): string {
  if (assetClass === "forex") return "analyste forex (paires de devises)";
  if (assetClass === "equity") return "analyste actions US (bourse)";
  return "analyste marché crypto";
}

export async function analyzeMarket(input: {
  symbol: string;
  question?: string;
}): Promise<MarketAnalysisResult | null> {
  const ref = resolveAsset(input.symbol);
  if (!ref) return null;

  const snapshot = await fetchAssetSnapshot(ref);
  if (!snapshot) return null;

  const dataBlock = formatSnapshotForPrompt(snapshot);
  const system = `Tu es Klir IA — ${analystRole(snapshot.assetClass)} (informatif, pas conseil financier).
Utilise UNIQUEMENT les données fournies. Ne invente pas de prix.
Structure ta réponse en markdown :
## Résumé
(3-5 phrases factuelles — le graphique TradingView interactif et l'export PNG/JPEG sont affichés sous ta réponse)

## Haussier
(conditions + cible indicative si données le permettent — formulé en conditionnel)

## Neutre
(range / consolidation)

## Baissier
(risques + niveaux de vigilance)

Ton : français clair, studio-grade, sans hype.`;

  const userQ = input.question?.trim() || "Analyse et pronostic court terme.";

  const result = await chat({
    system,
    messages: [
      {
        role: "user",
        content: `Données live (${snapshot.source}) :\n${dataBlock}\n\nQuestion : ${userQ}`,
      },
    ],
  });

  const { summary, scenarios } = parseSections(result.content);

  return {
    symbol: snapshot.symbol,
    snapshot,
    summary: summary || result.content.slice(0, 800),
    scenarios,
    disclaimer: TRADING_DISCLAIMER_FR,
    provider: result.provider,
  };
}

export function isTradingIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return /trading|trade\b|crypto|bitcoin|btc|ethereum|eth\b|analyse.?march|market.?analysis|pronostic|forex|devise|eur\/usd|usd\/htg|xau|gold|or\b|action\b|bourse|nasdaq|s&p|cours du|prix du|support|résistance|bull|bear|haussier|baissier|aapl|tsla|nvda|order block|fvg|smc|backtest|sharpe|drawdown|options binaires|mt5|metatrader/.test(
    lower
  );
}

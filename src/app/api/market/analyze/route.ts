import { NextResponse } from "next/server";
import { analyzeMarket } from "@/lib/market/analyze";
import { resolveAsset } from "@/lib/market/symbols";
import { TRADING_DISCLAIMER_FR } from "@/lib/market/types";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { getAuthUser } from "@/lib/auth/server";

type Body = {
  symbol?: string;
  question?: string;
};

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limit = await checkRateLimit(`market-analyze:${ip}`);
  if (!limit.ok) {
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  let userId: string | null = null;
  try {
    userId = (await getAuthUser()).userId;
  } catch {
    userId = null;
  }
  if (!userId) {
    return NextResponse.json(
      {
        error: "Connectez-vous pour une analyse trading complète.",
        code: "SIGNUP_REQUIRED",
        disclaimer: TRADING_DISCLAIMER_FR,
      },
      { status: 401 }
    );
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const symbol = body.symbol?.trim();
  if (!symbol) {
    return NextResponse.json(
      { error: "symbol requis (ex. BTC, EUR/USD, AAPL)." },
      { status: 400 }
    );
  }

  if (!resolveAsset(symbol)) {
    return NextResponse.json(
      {
        error: `Symbole « ${symbol} » non supporté.`,
        disclaimer: TRADING_DISCLAIMER_FR,
      },
      { status: 400 }
    );
  }

  try {
    const analysis = await analyzeMarket({ symbol, question: body.question });
    if (!analysis) {
      return NextResponse.json(
        { error: "Analyse indisponible.", disclaimer: TRADING_DISCLAIMER_FR },
        { status: 503 }
      );
    }
    return NextResponse.json({ analysis });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Erreur analyse",
        disclaimer: TRADING_DISCLAIMER_FR,
      },
      { status: 503 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: "Klir IA Market Analyze",
    method: "POST",
    body: { symbol: "BTC", question: "Analyse court terme" },
    examples: ["BTC", "EUR/USD", "USD/HTG", "AAPL", "TSLA"],
    disclaimer: TRADING_DISCLAIMER_FR,
    sources: ["CoinGecko", "Alpha Vantage", "Alternative.me Fear & Greed"],
  });
}

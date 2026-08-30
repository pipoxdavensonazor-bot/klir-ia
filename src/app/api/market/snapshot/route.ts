import { NextResponse } from "next/server";
import { fetchAssetSnapshot, fetchAssetSnapshots } from "@/lib/market/fetch";
import { extractAssetsFromText, resolveAsset } from "@/lib/market/symbols";
import { TRADING_DISCLAIMER_FR } from "@/lib/market/types";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const limit = await checkRateLimit(`market:${ip}`);
  if (!limit.ok) {
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  const url = new URL(req.url);
  const symbol = url.searchParams.get("symbol")?.trim();
  const q = url.searchParams.get("q")?.trim();

  if (q) {
    const refs = extractAssetsFromText(q);
    if (!refs.length) {
      return NextResponse.json(
        {
          error: "Symbole non reconnu. Ex. BTC, EUR/USD, AAPL.",
          disclaimer: TRADING_DISCLAIMER_FR,
        },
        { status: 400 }
      );
    }
    const snapshots = await fetchAssetSnapshots(refs);
    return NextResponse.json({ snapshots, disclaimer: TRADING_DISCLAIMER_FR });
  }

  if (!symbol) {
    return NextResponse.json(
      { error: "Paramètre symbol ou q requis.", disclaimer: TRADING_DISCLAIMER_FR },
      { status: 400 }
    );
  }

  const ref = resolveAsset(symbol);
  if (!ref) {
    return NextResponse.json(
      {
        error: `Symbole « ${symbol} » non supporté (crypto, forex ou action US).`,
        disclaimer: TRADING_DISCLAIMER_FR,
      },
      { status: 400 }
    );
  }

  const snapshot = await fetchAssetSnapshot(ref);
  if (!snapshot) {
    const hint =
      ref.assetClass === "crypto"
        ? "Données crypto indisponibles (CoinGecko). Réessayez dans quelques minutes."
        : ref.assetClass === "forex"
          ? "Données forex indisponibles (Alpha Vantage — quota 25 req/jour)."
          : "Données action indisponibles (Alpha Vantage — quota 25 req/jour).";
    return NextResponse.json({ error: hint, disclaimer: TRADING_DISCLAIMER_FR }, { status: 503 });
  }

  return NextResponse.json({ snapshot, disclaimer: TRADING_DISCLAIMER_FR });
}

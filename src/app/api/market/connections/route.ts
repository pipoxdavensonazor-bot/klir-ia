import { NextResponse } from "next/server";
import { listMarketConnections } from "@/lib/market/connections";
import { TRADING_DISCLAIMER_FR } from "@/lib/market/types";

export async function GET() {
  return NextResponse.json({
    connections: listMarketConnections(),
    disclaimer: TRADING_DISCLAIMER_FR,
    readOnlyNote:
      "Binance et eToro : connexion lecture seule uniquement — aucun ordre ni retrait via Klir IA.",
  });
}

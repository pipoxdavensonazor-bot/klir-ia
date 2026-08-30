import { NextResponse } from "next/server";
import { geoProfileFromRequest } from "@/lib/geo/locale";

/** Détecte pays, devise et méthodes de paiement recommandées selon la localisation. */
export async function GET(req: Request) {
  const geo = geoProfileFromRequest(req);
  return NextResponse.json({ geo });
}

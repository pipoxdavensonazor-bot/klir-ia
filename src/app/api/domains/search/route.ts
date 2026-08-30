import { NextResponse } from "next/server";
import { searchDomainAvailability } from "@/lib/domains/search";
import { listSupportedTlds } from "@/lib/billing/catalog";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const limit = await checkRateLimit(`domains:search:ip:${ip}`, 20, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Trop de recherches. Réessayez plus tard." }, { status: 429 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ error: "Entrez un nom (ex. mon-salon)." }, { status: 400 });
  }

  try {
    const results = await searchDomainAvailability(q);
    return NextResponse.json({ query: q, results, supportedTlds: listSupportedTlds() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Recherche impossible" },
      { status: 400 }
    );
  }
}

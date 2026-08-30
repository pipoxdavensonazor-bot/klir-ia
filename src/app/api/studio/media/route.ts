import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { searchStockPhotos } from "@/lib/studio/media";
import { getClientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const limit = await checkRateLimit(ip);
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
      { error: "Connectez-vous pour chercher des images licenciées.", code: "SIGNUP_REQUIRED" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  if (!q) {
    return NextResponse.json({ error: "Paramètre q requis" }, { status: 400 });
  }

  const photos = await searchStockPhotos(q, 8);
  if (!photos.length) {
    return NextResponse.json({
      photos: [],
      hint: "Aucune image. Configurez UNSPLASH_ACCESS_KEY ou PEXELS_API_KEY (API officielles, pas de scraping).",
    });
  }
  return NextResponse.json({ photos });
}

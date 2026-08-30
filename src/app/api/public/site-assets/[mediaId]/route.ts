import { getSiteMediaById } from "@/lib/hosting/site-admin";
import { getR2 } from "@/lib/r2";

type Params = { params: Promise<{ mediaId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { mediaId } = await params;
  const row = await getSiteMediaById(mediaId);
  if (!row) {
    return new Response("Média introuvable.", { status: 404 });
  }

  const r2 = getR2();
  if (!r2) {
    return new Response("Stockage indisponible.", { status: 503 });
  }

  const obj = await r2.get(row.r2_key);
  if (!obj) {
    return new Response("Fichier introuvable.", { status: 404 });
  }

  const bytes = await obj.arrayBuffer();
  return new Response(bytes, {
    headers: {
      "Content-Type": row.content_type,
      "Cache-Control": "public, max-age=86400",
    },
  });
}

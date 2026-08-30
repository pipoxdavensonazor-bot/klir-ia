import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { geoProfileFromRequest } from "@/lib/geo/locale";
import { listSiteMedia, uploadSiteMedia } from "@/lib/hosting/site-admin";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Params) {
  const { userId } = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }
  const { slug } = await params;
  const country = geoProfileFromRequest(req).country;
  const media = await listSiteMedia(userId, slug, country);
  return NextResponse.json({ media });
}

export async function POST(req: Request, { params }: Params) {
  const { userId } = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }
  const { slug } = await params;
  const country = geoProfileFromRequest(req).country;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "FormData invalide" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }

  const origin = new URL(req.url).origin;

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const media = await uploadSiteMedia({
      userId,
      slug,
      filename: file.name,
      contentType: file.type || "image/jpeg",
      bytes,
      origin,
      bootstrapCountry: country,
    });
    return NextResponse.json({ media }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload échoué" },
      { status: 400 }
    );
  }
}

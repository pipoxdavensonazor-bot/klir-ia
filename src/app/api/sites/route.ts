import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { hostedUrls, listUserHostedSites, normalizeSlug, saveSiteDraft } from "@/lib/hosting/sites";

type Body = {
  slug?: string;
  title?: string;
  html?: string;
};

export async function GET() {
  const { userId } = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  const sites = await listUserHostedSites(userId);
  return NextResponse.json({
    sites: sites.map((s) => ({
      slug: s.slug,
      title: s.title,
      status: s.status,
      expiresAt: s.expires_at,
      urls: hostedUrls(s.slug),
    })),
  });
}

/** Prépare un brouillon de site avant paiement hébergement. */
export async function POST(req: Request) {
  const { userId } = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const slug = normalizeSlug(body.slug ?? "");
  const html = body.html?.trim();
  if (!slug || !html || html.length < 40) {
    return NextResponse.json({ error: "Nom d'URL et HTML du site requis." }, { status: 400 });
  }
  if (html.length > 900_000) {
    return NextResponse.json({ error: "Site trop volumineux (max ~900 Ko)." }, { status: 413 });
  }
  const title = (body.title?.trim() || slug) as string;

  try {
    const draft = await saveSiteDraft({ userId, slug, title, html });
    return NextResponse.json({
      draftId: draft.draftId,
      slug,
      title,
      expiresAt: draft.expiresAt,
      hostingPlanId: "host30d",
      urls: hostedUrls(slug),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur préparation site" },
      { status: 503 }
    );
  }
}

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { parsePaymentMethods, type SitePaymentMethods } from "@/lib/geo/locale";
import { geoProfileFromRequest } from "@/lib/geo/locale";
import {
  getSiteHtmlForOwner,
  getSiteSettingsForUser,
  updateSiteHtml,
  updateSiteSettings,
  type SiteSettingsRow,
} from "@/lib/hosting/site-admin";
import { hostedUrls } from "@/lib/hosting/sites";

type Params = { params: Promise<{ slug: string }> };

function serializeSettings(row: SiteSettingsRow) {
  return {
    businessName: row.business_name,
    businessCountry: row.business_country,
    businessCity: row.business_city,
    businessRegion: row.business_region,
    locale: row.locale,
    currency: row.currency,
    timezone: row.timezone,
    paymentMethods: parsePaymentMethods(row.payment_methods_json),
    assistantNotes: row.assistant_notes,
    updatedAt: row.updated_at,
  };
}

export async function GET(req: Request, { params }: Params) {
  const { userId } = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }
  const { slug } = await params;
  const country = geoProfileFromRequest(req).country;
  const ctx = await getSiteSettingsForUser(userId, slug, { bootstrapGeoCountry: country });
  if (!ctx) {
    return NextResponse.json({ error: "Site introuvable ou accès refusé." }, { status: 404 });
  }
  const html = await getSiteHtmlForOwner(userId, slug);
  return NextResponse.json({
    site: {
      slug: ctx.site.slug,
      title: ctx.site.title,
      status: ctx.site.status,
      expiresAt: ctx.site.expires_at,
      urls: hostedUrls(ctx.site.slug),
    },
    settings: serializeSettings(ctx.settings),
    html,
    adminReady: true,
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const { userId } = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }
  const { slug } = await params;

  let body: {
    html?: string;
    title?: string;
    settings?: {
      businessName?: string;
      businessCountry?: string;
      businessCity?: string;
      businessRegion?: string;
      locale?: string;
      currency?: string;
      timezone?: string;
      paymentMethods?: SitePaymentMethods;
      assistantNotes?: string;
    };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  try {
    if (body.html) {
      await updateSiteHtml({
        userId,
        slug,
        html: body.html,
        title: body.title,
      });
    }

    if (body.settings) {
      await updateSiteSettings({
        userId,
        slug,
        businessName: body.settings.businessName,
        businessCountry: body.settings.businessCountry,
        businessCity: body.settings.businessCity,
        businessRegion: body.settings.businessRegion,
        locale: body.settings.locale,
        currency: body.settings.currency,
        timezone: body.settings.timezone,
        paymentMethods: body.settings.paymentMethods,
        assistantNotes: body.settings.assistantNotes,
      });
    }

    const ctx = await getSiteSettingsForUser(userId, slug);
    if (!ctx) {
      return NextResponse.json({ error: "Site introuvable." }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      site: {
        slug: ctx.site.slug,
        title: ctx.site.title,
        urls: hostedUrls(ctx.site.slug),
      },
      settings: serializeSettings(ctx.settings),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Mise à jour échouée" },
      { status: 400 }
    );
  }
}

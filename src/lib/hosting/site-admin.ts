import { getDb } from "@/lib/d1";
import {
  defaultPaymentMethods,
  geoProfileForCountry,
  parsePaymentMethods,
  type GeoProfile,
  type SitePaymentMethods,
} from "@/lib/geo/locale";
import type { HostedSiteRow } from "@/lib/hosting/sites";
import { getHostedSiteBySlug, normalizeSlug } from "@/lib/hosting/sites";
import { getR2 } from "@/lib/r2";
import { enhancePublishedSiteHtml } from "@/lib/studio/site-html-enhance";

export type SiteSettingsRow = {
  site_id: string;
  user_id: string;
  business_name: string | null;
  business_country: string;
  business_city: string | null;
  business_region: string | null;
  locale: string;
  currency: string;
  timezone: string;
  payment_methods_json: string;
  geo_detected_json: string | null;
  assistant_notes: string | null;
  created_at: number;
  updated_at: number;
};

export type SiteMediaRow = {
  id: string;
  site_id: string;
  user_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  r2_key: string;
  public_url: string;
  created_at: number;
};

function now() {
  return Date.now();
}

export async function ensureSiteAdmin(
  site: HostedSiteRow,
  geo: GeoProfile,
  businessName?: string
): Promise<SiteSettingsRow> {
  const db = getDb();
  const existing = await db
    .prepare(`SELECT * FROM site_settings WHERE site_id = ?`)
    .bind(site.id)
    .first<SiteSettingsRow>();

  if (existing) return existing;

  const ts = now();
  const payments = defaultPaymentMethods(geo.country);
  await db
    .prepare(
      `INSERT INTO site_settings
       (site_id, user_id, business_name, business_country, business_city, business_region,
        locale, currency, timezone, payment_methods_json, geo_detected_json, assistant_notes,
        created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      site.id,
      site.user_id,
      businessName ?? site.title,
      geo.country,
      geo.locale,
      geo.currency,
      geo.timezone,
      JSON.stringify(payments),
      JSON.stringify(geo),
      "Compte admin créé automatiquement. Configurez vos photos et paiements dans le tableau de bord.",
      ts,
      ts
    )
    .run();

  const row = await db
    .prepare(`SELECT * FROM site_settings WHERE site_id = ?`)
    .bind(site.id)
    .first<SiteSettingsRow>();
  if (!row) throw new Error("Impossible de créer le compte admin du site.");
  return row;
}

export async function getSiteSettingsForUser(
  userId: string,
  slugInput: string,
  opts?: { bootstrapGeoCountry?: string }
): Promise<{ site: HostedSiteRow; settings: SiteSettingsRow } | null> {
  const slug = normalizeSlug(slugInput);
  if (!slug) return null;
  const site = await getHostedSiteBySlug(slug);
  if (!site || site.user_id !== userId) return null;

  const db = getDb();
  let settings = await db
    .prepare(`SELECT * FROM site_settings WHERE site_id = ? AND user_id = ?`)
    .bind(site.id, userId)
    .first<SiteSettingsRow>();

  if (!settings && opts?.bootstrapGeoCountry) {
    const geo = geoProfileForCountry(opts.bootstrapGeoCountry);
    settings = await ensureSiteAdmin(site, geo, site.title);
  }

  if (!settings) return null;
  return { site, settings };
}

export async function updateSiteHtml(input: {
  userId: string;
  slug: string;
  html: string;
  title?: string;
}): Promise<HostedSiteRow> {
  const slug = normalizeSlug(input.slug);
  if (!slug) throw new Error("Slug invalide.");
  const html = input.html.trim();
  if (html.length < 40 || html.length > 900_000) {
    throw new Error("HTML invalide (40 car. min, 900 Ko max).");
  }

  const site = await getHostedSiteBySlug(slug);
  if (!site || site.user_id !== input.userId) {
    throw new Error("Site introuvable ou accès refusé.");
  }

  const settings = await getDb()
    .prepare(`SELECT * FROM site_settings WHERE site_id = ?`)
    .bind(site.id)
    .first<SiteSettingsRow>();

  const enhanced = enhancePublishedSiteHtml(html, {
    brandName: settings?.business_name ?? site.title,
    shareUrl: `https://${slug}.sites.klirline.io`,
  });

  const r2 = getR2();
  if (!r2) throw new Error("Stockage indisponible.");
  await r2.put(site.r2_key, enhanced, {
    httpMetadata: { contentType: "text/html; charset=utf-8" },
    customMetadata: { userId: input.userId, slug, title: input.title ?? site.title },
  });

  const ts = now();
  const db = getDb();
  if (input.title?.trim()) {
    await db
      .prepare(`UPDATE hosted_sites SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?`)
      .bind(input.title.trim().slice(0, 120), ts, site.id, input.userId)
      .run();
  } else {
    await db
      .prepare(`UPDATE hosted_sites SET updated_at = ? WHERE id = ? AND user_id = ?`)
      .bind(ts, site.id, input.userId)
      .run();
  }

  const updated = await db
    .prepare(`SELECT * FROM hosted_sites WHERE id = ?`)
    .bind(site.id)
    .first<HostedSiteRow>();
  if (!updated) throw new Error("Mise à jour échouée.");
  return updated;
}

export async function updateSiteSettings(input: {
  userId: string;
  slug: string;
  businessName?: string;
  businessCountry?: string;
  businessCity?: string;
  businessRegion?: string;
  locale?: string;
  currency?: string;
  timezone?: string;
  paymentMethods?: SitePaymentMethods;
  assistantNotes?: string;
}): Promise<SiteSettingsRow> {
  const ctx = await getSiteSettingsForUser(input.userId, input.slug);
  if (!ctx) throw new Error("Site ou réglages introuvables.");

  const ts = now();
  const country = input.businessCountry ?? ctx.settings.business_country;
  const geo = geoProfileForCountry(country);

  const paymentMethods =
    input.paymentMethods ?? parsePaymentMethods(ctx.settings.payment_methods_json);

  await getDb()
    .prepare(
      `UPDATE site_settings SET
         business_name = COALESCE(?, business_name),
         business_country = ?,
         business_city = COALESCE(?, business_city),
         business_region = COALESCE(?, business_region),
         locale = COALESCE(?, locale),
         currency = COALESCE(?, currency),
         timezone = COALESCE(?, timezone),
         payment_methods_json = ?,
         assistant_notes = COALESCE(?, assistant_notes),
         updated_at = ?
       WHERE site_id = ? AND user_id = ?`
    )
    .bind(
      input.businessName?.trim() || null,
      country,
      input.businessCity?.trim() || null,
      input.businessRegion?.trim() || null,
      input.locale ?? geo.locale,
      input.currency ?? geo.currency,
      input.timezone ?? geo.timezone,
      JSON.stringify(paymentMethods),
      input.assistantNotes?.trim() || null,
      ts,
      ctx.site.id,
      input.userId
    )
    .run();

  const row = await getDb()
    .prepare(`SELECT * FROM site_settings WHERE site_id = ?`)
    .bind(ctx.site.id)
    .first<SiteSettingsRow>();
  if (!row) throw new Error("Mise à jour réglages échouée.");
  return row;
}

export async function uploadSiteMedia(input: {
  userId: string;
  slug: string;
  filename: string;
  contentType: string;
  bytes: Uint8Array;
  origin: string;
  bootstrapCountry?: string;
}): Promise<SiteMediaRow> {
  let ctx = await getSiteSettingsForUser(input.userId, input.slug, {
    bootstrapGeoCountry: input.bootstrapCountry ?? "HT",
  });
  if (!ctx) throw new Error("Site introuvable ou accès refusé.");

  if (!input.contentType.startsWith("image/")) {
    throw new Error("Seules les images sont acceptées pour le site.");
  }
  if (input.bytes.length > 8 * 1024 * 1024) {
    throw new Error("Image trop volumineuse (max 8 Mo).");
  }

  const mediaId = `smedia_${crypto.randomUUID().replace(/-/g, "")}`;
  const safeName = input.filename.replace(/[^\w.\-]+/g, "_").slice(0, 80);
  const r2Key = `sites/${input.userId}/${ctx.site.slug}/media/${mediaId}_${safeName}`;
  const publicUrl = `${input.origin.replace(/\/$/, "")}/api/public/site-assets/${mediaId}`;

  const r2 = getR2();
  if (!r2) throw new Error("Stockage R2 indisponible.");

  await r2.put(r2Key, input.bytes, {
    httpMetadata: { contentType: input.contentType },
    customMetadata: { userId: input.userId, siteId: ctx.site.id, filename: input.filename },
  });

  const ts = now();
  await getDb()
    .prepare(
      `INSERT INTO site_media
       (id, site_id, user_id, filename, content_type, size_bytes, r2_key, public_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      mediaId,
      ctx.site.id,
      input.userId,
      input.filename.slice(0, 200),
      input.contentType,
      input.bytes.length,
      r2Key,
      publicUrl,
      ts
    )
    .run();

  const row = await getDb()
    .prepare(`SELECT * FROM site_media WHERE id = ?`)
    .bind(mediaId)
    .first<SiteMediaRow>();
  if (!row) throw new Error("Upload média échoué.");
  return row;
}

export async function listSiteMedia(
  userId: string,
  slug: string,
  bootstrapCountry?: string
): Promise<SiteMediaRow[]> {
  const ctx = await getSiteSettingsForUser(userId, slug, {
    bootstrapGeoCountry: bootstrapCountry ?? "HT",
  });
  if (!ctx) return [];
  const res = await getDb()
    .prepare(`SELECT * FROM site_media WHERE site_id = ? ORDER BY created_at DESC LIMIT 40`)
    .bind(ctx.site.id)
    .all<SiteMediaRow>();
  return res.results ?? [];
}

export async function getSiteMediaById(mediaId: string): Promise<SiteMediaRow | null> {
  const row = await getDb()
    .prepare(
      `SELECT m.* FROM site_media m
       JOIN hosted_sites s ON s.id = m.site_id
       WHERE m.id = ? AND s.status = 'active' AND s.expires_at > ?`
    )
    .bind(mediaId, now())
    .first<SiteMediaRow>();
  return row ?? null;
}

export async function getSiteHtmlForOwner(userId: string, slug: string): Promise<string | null> {
  const site = await getHostedSiteBySlug(slug);
  if (!site || site.user_id !== userId) return null;
  const r2 = getR2();
  if (!r2) return null;
  const obj = await r2.get(site.r2_key);
  if (!obj) return null;
  return obj.text();
}

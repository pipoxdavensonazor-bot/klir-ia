import { getHostingPlan } from "@/lib/billing/catalog";
import { getDb } from "@/lib/d1";
import { getR2 } from "@/lib/r2";
import { enhancePublishedSiteHtml } from "@/lib/studio/site-html-enhance";

export type HostedSiteRow = {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  r2_key: string;
  status: string;
  expires_at: number;
  payment_order_id: string | null;
  custom_domain: string | null;
  created_at: number;
  updated_at: number;
};

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

export function normalizeSlug(input: string): string | null {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug || !SLUG_RE.test(slug)) return null;
  const reserved = new Set(["api", "admin", "www", "mail", "app", "pricing", "sign-in", "sign-up"]);
  if (reserved.has(slug)) return null;
  return slug;
}

/** Refuse si un autre utilisateur possède déjà ce slug actif. */
export async function assertSlugAvailableForUser(userId: string, slugInput: string): Promise<string> {
  const slug = normalizeSlug(slugInput);
  if (!slug) throw new Error("Slug invalide.");

  const db = getDb();
  const now = Date.now();
  const existing = await db
    .prepare(`SELECT user_id, status, expires_at FROM hosted_sites WHERE slug = ?`)
    .bind(slug)
    .first<{ user_id: string; status: string; expires_at: number }>();

  if (!existing) return slug;
  if (existing.user_id === userId) return slug;
  if (existing.status !== "active" || existing.expires_at <= now) return slug;

  throw new Error("Ce nom d'URL est déjà utilisé par un autre site actif. Choisissez un autre nom.");
}

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export async function saveSiteDraft(input: {
  userId: string;
  slug: string;
  title: string;
  html: string;
}): Promise<{ draftId: string; expiresAt: number }> {
  const r2 = getR2();
  if (!r2) throw new Error("Stockage R2 indisponible pour l'hébergement.");

  const draftId = id("draft");
  const r2Key = `drafts/${input.userId}/${draftId}.html`;
  const now = Date.now();
  const expiresAt = now + 24 * 60 * 60 * 1000;

  await r2.put(r2Key, input.html, {
    httpMetadata: { contentType: "text/html; charset=utf-8" },
    customMetadata: { userId: input.userId, slug: input.slug, title: input.title },
  });

  const db = getDb();
  await db
    .prepare(
      `INSERT INTO site_drafts (id, user_id, title, slug, r2_key, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(draftId, input.userId, input.title.slice(0, 120), input.slug, r2Key, now, expiresAt)
    .run();

  return { draftId, expiresAt };
}

export async function publishHostedSiteFromDraft(input: {
  userId: string;
  draftId: string;
  slug: string;
  title: string;
  paymentOrderId: string;
  planId: string;
}): Promise<HostedSiteRow> {
  const slug = normalizeSlug(input.slug);
  if (!slug) throw new Error("Slug invalide.");

  await assertSlugAvailableForUser(input.userId, slug);

  const plan = getHostingPlan(input.planId);
  if (!plan) throw new Error("Forfait hébergement invalide.");

  const db = getDb();
  const draft = await db
    .prepare(
      `SELECT id, user_id, title, slug, r2_key FROM site_drafts
       WHERE id = ? AND user_id = ? AND expires_at > ?`
    )
    .bind(input.draftId, input.userId, Date.now())
    .first<{ id: string; user_id: string; title: string; slug: string; r2_key: string }>();

  if (!draft) throw new Error("Brouillon introuvable ou expiré.");

  const r2 = getR2();
  if (!r2) throw new Error("R2 indisponible.");

  const obj = await r2.get(draft.r2_key);
  if (!obj) throw new Error("Contenu du site introuvable.");
  let html = await obj.text();
  html = enhancePublishedSiteHtml(html, {
    brandName: input.title,
    shareUrl: `https://${slug}.sites.klirline.io`,
  });

  const hostedKey = `hosted/${slug}/index.html`;
  await r2.put(hostedKey, html, {
    httpMetadata: { contentType: "text/html; charset=utf-8" },
    customMetadata: { userId: input.userId, slug, title: input.title },
  });

  const now = Date.now();
  const expiresAt = now + plan.durationMs;
  const siteId = id("site");

  const existing = await db
    .prepare(`SELECT id, user_id FROM hosted_sites WHERE slug = ?`)
    .bind(slug)
    .first<{ id: string; user_id: string }>();

  if (existing) {
    if (existing.user_id !== input.userId) {
      throw new Error("Ce nom d'URL appartient à un autre site actif.");
    }
    await db
      .prepare(
        `UPDATE hosted_sites
         SET title = ?, r2_key = ?, status = 'active', expires_at = ?,
             payment_order_id = ?, updated_at = ?
         WHERE slug = ? AND user_id = ?`
      )
      .bind(
        input.title.slice(0, 120),
        hostedKey,
        expiresAt,
        input.paymentOrderId,
        now,
        slug,
        input.userId
      )
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO hosted_sites
         (id, user_id, slug, title, r2_key, status, expires_at, payment_order_id, custom_domain, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?, NULL, ?, ?)`
      )
      .bind(siteId, input.userId, slug, input.title.slice(0, 120), hostedKey, expiresAt, input.paymentOrderId, now, now)
      .run();
  }

  await db.prepare(`DELETE FROM site_drafts WHERE id = ?`).bind(input.draftId).run();

  const row = await db
    .prepare(`SELECT * FROM hosted_sites WHERE slug = ?`)
    .bind(slug)
    .first<HostedSiteRow>();
  if (!row) throw new Error("Publication échouée.");
  return row;
}

export async function getHostedSiteBySlug(slug: string): Promise<HostedSiteRow | null> {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;
  const db = getDb();
  const row = await db
    .prepare(`SELECT * FROM hosted_sites WHERE slug = ? AND status = 'active' AND expires_at > ?`)
    .bind(normalized, Date.now())
    .first<HostedSiteRow>();
  return row ?? null;
}

export async function getHostedSiteHtml(slug: string): Promise<string | null> {
  const row = await getHostedSiteBySlug(slug);
  if (!row) return null;
  const r2 = getR2();
  if (!r2) return null;
  const obj = await r2.get(row.r2_key);
  if (!obj) return null;
  return obj.text();
}

export async function listUserHostedSites(userId: string): Promise<HostedSiteRow[]> {
  const db = getDb();
  const res = await db
    .prepare(
      `SELECT * FROM hosted_sites WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20`
    )
    .bind(userId)
    .all<HostedSiteRow>();
  return res.results ?? [];
}

export function hostedUrls(slug: string): { path: string; subdomain: string } {
  const subdomain = `https://${slug}.sites.klirline.io`;
  return {
    path: subdomain,
    subdomain,
  };
}

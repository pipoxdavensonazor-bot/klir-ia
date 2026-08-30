import type { SiteAssetBundle } from "@/lib/studio/site-assets";
import type { SiteWizardAnswers } from "@/lib/studio/site-wizard";
import { getSiteTemplateMeta } from "@/lib/studio/templates/catalog";
import { templateHtml } from "@/lib/studio/templates/html";
import {
  applySiteLanguage,
  applyWizardSections,
} from "@/lib/studio/templates/section-compose";
import { applyTemplateDefaults, applyTemplateTierExtras } from "@/lib/studio/templates/theme-extras";

export type TemplateRenderContext = {
  brandName: string;
  tagline: string;
  sector: string;
  ctaText: string;
  ctaUrl: string;
  primaryColor: string;
  accentColor: string;
  heroImage: string;
  heroAlt: string;
  galleryHtml: string;
  partnersHtml: string;
  benefitsHtml: string;
  testimonialsHtml: string;
  year: string;
  attributions: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function defaultTagline(answers: SiteWizardAnswers): string {
  if (answers.tagline.trim()) return answers.tagline.trim();
  const brand = answers.brandName.trim() || "Votre marque";
  const sector = answers.sector.trim() || "votre secteur";
  const objectives: Record<string, string> = {
    leads: `L'expertise ${brand} pour ${sector} — contactez-nous dès aujourd'hui.`,
    ventes: `Des offres claires pour ${sector}, pensées pour convertir.`,
    inscription: `Rejoignez ${brand} — places limitées, inscrivez-vous maintenant.`,
    info: `${brand} — référence en ${sector}, qualité et confiance.`,
    rdv: `Prenez rendez-vous avec ${brand} — disponibilités rapides.`,
  };
  return objectives[answers.objective] ?? `${brand} — excellence en ${sector}.`;
}

function buildBenefitsHtml(answers: SiteWizardAnswers, primary: string): string {
  const audienceLabels: Record<string, string> = {
    local: "clients de votre quartier",
    b2b: "entreprises et décideurs",
    jeunes: "une clientèle connectée",
    premium: "une clientèle exigeante",
    mixte: "un large public",
  };
  const audience = audienceLabels[answers.audience] ?? "vos clients";
  const items = [
    {
      title: "Expertise reconnue",
      text: `Une équipe dédiée au ${answers.sector || "métier"}, adaptée à ${audience}.`,
    },
    {
      title: "Approche sur mesure",
      text: "Chaque projet est adapté à vos objectifs et à votre audience.",
    },
    {
      title: "Réactivité",
      text: answers.contactPhone
        ? `Joignable rapidement — ${answers.contactPhone}.`
        : "Un interlocuteur unique et des délais respectés.",
    },
  ];
  return items
    .map(
      (b) =>
        `<article style="padding:24px;border-radius:16px;background:#fff;border:1px solid rgba(0,0,0,.06)"><h3 style="margin:0 0 8px;font-size:1.1rem;color:${primary}">${escapeHtml(b.title)}</h3><p style="margin:0;color:#64748b;line-height:1.6">${escapeHtml(b.text)}</p></article>`
    )
    .join("");
}

function buildTestimonialsHtml(brandName: string): string {
  const quotes = [
    { name: "Marie D.", role: "Cliente", text: `Une expérience impeccable avec ${brandName}. Professionnalisme et résultats au rendez-vous.` },
    { name: "Jean-Paul R.", role: "Partenaire", text: "Communication claire, livrables soignés. Je recommande sans hésiter." },
  ];
  return quotes
    .map(
      (q) =>
        `<blockquote style="margin:0;padding:24px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)"><p style="margin:0 0 12px;font-style:italic;line-height:1.6">« ${escapeHtml(q.text)} »</p><footer style="font-size:.85rem;opacity:.75">— ${escapeHtml(q.name)}, ${escapeHtml(q.role)}</footer></blockquote>`
    )
    .join("");
}

function buildGalleryHtml(assets: SiteAssetBundle): string {
  const photos = [assets.hero, ...assets.gallery].slice(0, 4);
  return photos
    .map(
      (p) =>
        `<figure style="margin:0;border-radius:12px;overflow:hidden;aspect-ratio:4/3"><img src="${p.url}" alt="${escapeHtml(p.alt)}" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy"/></figure>`
    )
    .join("");
}

function buildPartnersHtml(assets: SiteAssetBundle): string {
  return assets.partners
    .map(
      (p) =>
        `<li style="list-style:none;display:flex;align-items:center;justify-content:center;padding:14px 18px;background:#f8fafc;border-radius:12px;border:1px solid rgba(0,0,0,.08)"><img src="${p.logoDataUrl}" alt="${escapeHtml(p.name)}" height="36" style="height:36px;width:auto"/></li>`
    )
    .join("");
}

export function buildTemplateContext(
  answers: SiteWizardAnswers,
  assets: SiteAssetBundle
): TemplateRenderContext {
  const brandName = answers.brandName.trim() || "Votre marque";
  const meta = getSiteTemplateMeta(answers.templateId);
  const colors = applyTemplateDefaults(answers, {
    primary: meta?.preview.primary ?? answers.primaryColor,
    accent: meta?.preview.accent ?? answers.accentColor,
  });

  return {
    brandName,
    tagline: defaultTagline(answers),
    sector: answers.sector.trim() || "services professionnels",
    ctaText: answers.ctaText.trim() || "Commencer",
    ctaUrl: answers.ctaUrl.trim() && answers.ctaUrl !== "https://" ? answers.ctaUrl.trim() : "https://klirline.io",
    primaryColor: colors.primaryColor,
    accentColor: colors.accentColor,
    heroImage: assets.hero.url,
    heroAlt: assets.hero.alt,
    galleryHtml: buildGalleryHtml(assets),
    partnersHtml: buildPartnersHtml(assets),
    benefitsHtml: buildBenefitsHtml(answers, answers.primaryColor),
    testimonialsHtml: buildTestimonialsHtml(brandName),
    year: String(new Date().getFullYear()),
    attributions: assets.attributions.join(" · "),
  };
}

export function renderSiteTemplate(
  templateId: string,
  ctx: TemplateRenderContext,
  answers?: SiteWizardAnswers
): string {
  const meta = getSiteTemplateMeta(templateId);
  const id = meta?.id ?? "corporate-klir";
  let html = templateHtml(id);

  const map: Record<string, string> = {
    BRAND_NAME: escapeHtml(ctx.brandName),
    TAGLINE: escapeHtml(ctx.tagline),
    SECTOR: escapeHtml(ctx.sector),
    PRIMARY: ctx.primaryColor,
    ACCENT: ctx.accentColor,
    HERO_IMG: ctx.heroImage,
    HERO_ALT: escapeHtml(ctx.heroAlt),
    CTA_TEXT: escapeHtml(ctx.ctaText),
    CTA_URL: escapeHtml(ctx.ctaUrl),
    GALLERY_HTML: ctx.galleryHtml,
    PARTNERS_HTML: ctx.partnersHtml,
    BENEFITS_HTML: ctx.benefitsHtml,
    TESTIMONIALS_HTML: ctx.testimonialsHtml,
    YEAR: ctx.year,
    ATTRIBUTIONS: escapeHtml(ctx.attributions),
    PRO_EXTRA_CSS: "",
    PRO_STATS: "",
    PRO_TESTIMONIALS: "",
  };

  for (const [key, value] of Object.entries(map)) {
    html = html.replaceAll(`{{${key}}}`, value);
  }

  html = applyTemplateTierExtras(html, id, meta, ctx);
  if (answers) {
    html = applyWizardSections(html, answers, ctx, meta);
    html = applySiteLanguage(html, answers.language.trim() || "fr-CA");
  }
  return html;
}

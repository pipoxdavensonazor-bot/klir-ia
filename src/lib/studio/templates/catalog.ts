export type SiteTemplateTier = "free" | "pro";

export type SiteTemplateMeta = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  preview: {
    primary: string;
    accent: string;
    bg: string;
  };
  bestFor: string[];
  tier: SiteTemplateTier;
  /** Skill Klir IA source (design UI/UX) */
  skillId: string;
  skillLabel: string;
};

/**
 * Galerie templates — mappés aux skills design Klir IA
 * (frontend-design, taste-design, awesome-design-md, ui-ux-pro-max, etc.)
 * Inspiré des familles esthétiques du guide UI/UX Pro / Awesome DESIGN.md
 */
export const SITE_TEMPLATES: SiteTemplateMeta[] = [
  // ——— GRATUIT (8) ———
  {
    id: "corporate-klir",
    name: "Corporate Klir",
    description: "Base propre B2B — conversion claire, sections essentielles.",
    tags: ["Corporate", "PME", "Gratuit"],
    preview: { primary: "#004F6E", accent: "#D4AF37", bg: "#F7F5F0" },
    bestFor: ["services", "landing", "consultant"],
    tier: "free",
    skillId: "frontend-design",
    skillLabel: "Frontend Design",
  },
  {
    id: "warm-services",
    name: "Chaleureux Pro",
    description: "Warm Editorial — resto, salon, services locaux.",
    tags: ["Chaleureux", "Local", "Gratuit"],
    preview: { primary: "#1B4332", accent: "#D4A373", bg: "#FAF6F1" },
    bestFor: ["services", "evenement", "resto"],
    tier: "free",
    skillId: "theme-factory",
    skillLabel: "Theme Factory · Warm Trust",
  },
  {
    id: "minimal-portfolio",
    name: "Portfolio Minimal",
    description: "Taste minimal — whitespace, projets en avant.",
    tags: ["Minimal", "Portfolio", "Gratuit"],
    preview: { primary: "#111827", accent: "#6366F1", bg: "#FFFFFF" },
    bestFor: ["portfolio", "creatif"],
    tier: "free",
    skillId: "taste-design",
    skillLabel: "Taste · Minimal",
  },
  {
    id: "bold-startup",
    name: "Startup Bold",
    description: "Vibrant Block — SaaS, tech, CTA fort.",
    tags: ["Startup", "Tech", "Gratuit"],
    preview: { primary: "#0F172A", accent: "#22D3EE", bg: "#F8FAFC" },
    bestFor: ["landing", "tech", "boutique"],
    tier: "free",
    skillId: "frontend-aesthetics",
    skillLabel: "Frontend Aesthetics · Vibrant",
  },
  {
    id: "elegant-event",
    name: "Événement Élégant",
    description: "Design Sprint — RSVP, programme, speakers.",
    tags: ["Événement", "RSVP", "Gratuit"],
    preview: { primary: "#312E81", accent: "#F59E0B", bg: "#FFFBEB" },
    bestFor: ["evenement", "landing"],
    tier: "free",
    skillId: "design-sprint",
    skillLabel: "Design Sprint",
  },
  {
    id: "organic-wellness",
    name: "Organic Nature",
    description: "Biomorphic — bien-être, eco, formes douces.",
    tags: ["Organic", "Bien-être", "Gratuit"],
    preview: { primary: "#2D6A4F", accent: "#95D5B2", bg: "#F1FAF5" },
    bestFor: ["services", "sante", "eco"],
    tier: "free",
    skillId: "frontend-aesthetics",
    skillLabel: "Frontend Aesthetics · Organic",
  },
  {
    id: "brutal-spot",
    name: "Brutal Créatif",
    description: "Neon Brutalist — bordures dures, look anti-template.",
    tags: ["Brutal", "Créatif", "Gratuit"],
    preview: { primary: "#000000", accent: "#FF3366", bg: "#FFFF00" },
    bestFor: ["portfolio", "creatif", "mode"],
    tier: "free",
    skillId: "hallmark-design",
    skillLabel: "Hallmark · Anti-slop",
  },
  {
    id: "terminal-dev",
    name: "Terminal Dev",
    description: "Terminal-Core — outils dev, monospace, dark léger.",
    tags: ["Dev", "Terminal", "Gratuit"],
    preview: { primary: "#0D1117", accent: "#3FB950", bg: "#161B22" },
    bestFor: ["tech", "landing", "services"],
    tier: "free",
    skillId: "awesome-design-md",
    skillLabel: "Awesome DESIGN.md · Terminal",
  },

  // ——— PRO (10) — forfait ou crédits ———
  {
    id: "luxe-noir",
    name: "Luxe Noir",
    description: "Taste elite · Dark OLED — mode, haute couture, premium.",
    tags: ["Luxe", "Dark", "Pro"],
    preview: { primary: "#004F6E", accent: "#D4AF37", bg: "#050B0E" },
    bestFor: ["portfolio", "boutique", "mode"],
    tier: "pro",
    skillId: "taste-design",
    skillLabel: "Taste · Elite",
  },
  {
    id: "glass-future",
    name: "Glass Futurism",
    description: "Glass Soft-Futurism — blur, mesh, cartes verre.",
    tags: ["Glass", "Futuriste", "Pro"],
    preview: { primary: "#6366F1", accent: "#22D3EE", bg: "#0F172A" },
    bestFor: ["tech", "boutique", "landing"],
    tier: "pro",
    skillId: "awesome-design-md",
    skillLabel: "Awesome DESIGN.md · Glass",
  },
  {
    id: "cinematic-pro",
    name: "Cinematic Pro",
    description: "Cinematic Dark — hero cinéma, stats, preuve sociale.",
    tags: ["Cinéma", "Immo", "Pro"],
    preview: { primary: "#1a1a2e", accent: "#E94560", bg: "#0a0a0f" },
    bestFor: ["immo", "boutique", "evenement"],
    tier: "pro",
    skillId: "frontend-aesthetics",
    skillLabel: "Frontend Aesthetics · Cinematic",
  },
  {
    id: "swiss-data",
    name: "Swiss Data Pro",
    description: "Data-Dense Pro · UI/UX Pro Max — grilles, KPIs, confiance.",
    tags: ["Swiss", "Finance", "Pro"],
    preview: { primary: "#004F6E", accent: "#D4AF37", bg: "#FFFFFF" },
    bestFor: ["services", "landing", "consultant"],
    tier: "pro",
    skillId: "ui-ux-pro-max",
    skillLabel: "UI/UX Pro Max",
  },
  {
    id: "aurora-tech",
    name: "Aurora Tech",
    description: "Aurora Mesh — dégradés animés, SaaS premium.",
    tags: ["Aurora", "SaaS", "Pro"],
    preview: { primary: "#7C3AED", accent: "#06B6D4", bg: "#030712" },
    bestFor: ["tech", "landing", "boutique"],
    tier: "pro",
    skillId: "frontend-aesthetics",
    skillLabel: "Frontend Aesthetics · Aurora",
  },
  {
    id: "editorial-mag",
    name: "Editorial Magazine",
    description: "Impeccable · Editorial — typo display, grilles asymétriques.",
    tags: ["Editorial", "Mode", "Pro"],
    preview: { primary: "#111827", accent: "#D4AF37", bg: "#FAFAFA" },
    bestFor: ["portfolio", "mode", "creatif"],
    tier: "pro",
    skillId: "impeccable-design",
    skillLabel: "Impeccable Design",
  },
  {
    id: "hooked-convert",
    name: "Hooked Convert",
    description: "Hooked UX — funnel, urgence, conversion optimisée.",
    tags: ["Conversion", "CRO", "Pro"],
    preview: { primary: "#004F6E", accent: "#D4AF37", bg: "#F7F5F0" },
    bestFor: ["landing", "boutique", "services"],
    tier: "pro",
    skillId: "hooked-ux",
    skillLabel: "Hooked UX",
  },
  {
    id: "interface-saas",
    name: "Interface SaaS",
    description: "Interface Design — dashboard marketing, features grid pro.",
    tags: ["SaaS", "Product", "Pro"],
    preview: { primary: "#2563EB", accent: "#10B981", bg: "#F8FAFC" },
    bestFor: ["tech", "landing", "boutique"],
    tier: "pro",
    skillId: "interface-design",
    skillLabel: "Interface Design",
  },
  {
    id: "cult-indie",
    name: "Cult Indie",
    description: "Cult Indie — typographie expressive, niche créative.",
    tags: ["Indie", "Art", "Pro"],
    preview: { primary: "#7F1D1D", accent: "#FBBF24", bg: "#FFFBEB" },
    bestFor: ["portfolio", "creatif", "evenement"],
    tier: "pro",
    skillId: "awesome-design-md",
    skillLabel: "Awesome DESIGN.md · Cult Indie",
  },
  {
    id: "brand-guidelines",
    name: "Brand Guidelines",
    description: "Charte appliquée — cohérence marque, sections premium.",
    tags: ["Marque", "Agence", "Pro"],
    preview: { primary: "#004F6E", accent: "#D4AF37", bg: "#FFFFFF" },
    bestFor: ["services", "consultant", "landing"],
    tier: "pro",
    skillId: "brand-guidelines-design",
    skillLabel: "Brand Guidelines Design",
  },
];

export const DEFAULT_TEMPLATE_ID = "corporate-klir";

/** Corps HTML de base si pas de fichier dédié */
export const TEMPLATE_BODY_ALIAS: Record<string, string> = {
  "organic-wellness": "warm-services",
  "terminal-dev": "bold-startup",
  "brutal-spot": "bold-startup",
  "glass-future": "luxe-noir",
  "cinematic-pro": "luxe-noir",
  "swiss-data": "corporate-klir",
  "aurora-tech": "bold-startup",
  "editorial-mag": "minimal-portfolio",
  "hooked-convert": "corporate-klir",
  "interface-saas": "bold-startup",
  "cult-indie": "minimal-portfolio",
  "brand-guidelines": "corporate-klir",
};

export function getSiteTemplateMeta(id: string): SiteTemplateMeta | null {
  return SITE_TEMPLATES.find((t) => t.id === id) ?? null;
}

export function listSiteTemplates(tier?: SiteTemplateTier): SiteTemplateMeta[] {
  if (!tier) return SITE_TEMPLATES;
  return SITE_TEMPLATES.filter((t) => t.tier === tier);
}

export function isProTemplate(id: string): boolean {
  return getSiteTemplateMeta(id)?.tier === "pro";
}

export function resolveBodyTemplateId(id: string): string {
  return TEMPLATE_BODY_ALIAS[id] ?? id;
}

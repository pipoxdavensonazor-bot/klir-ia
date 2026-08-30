import { searchStockPhotos, type StockPhoto } from "@/lib/studio/media";

export type SitePartner = {
  name: string;
  logoDataUrl: string;
};

export type SiteAssetBundle = {
  hero: StockPhoto;
  gallery: StockPhoto[];
  about: StockPhoto | null;
  partners: SitePartner[];
  attributions: string[];
};

const CURATED: Record<string, string[]> = {
  default: [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80",
  ],
  resto: [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
  ],
  beaute: [
    "https://images.unsplash.com/photo-1560066984-138d9834a058?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80",
  ],
  sante: [
    "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1631217868264-e5b1bb5e2bb4?auto=format&fit=crop&w=1200&q=80",
  ],
  tech: [
    "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
  ],
  immo: [
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
  ],
  mode: [
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1483985988355-763728ad1434?auto=format&fit=crop&w=1200&q=80",
  ],
};

function sectorKey(sector: string, brief: string): string {
  const s = `${sector} ${brief}`.toLowerCase();
  if (/resto|food|caf[eé]|bar|bistro/i.test(s)) return "resto";
  if (/coiff|salon|beaut[eé]|spa|esth[eé]tique/i.test(s)) return "beaute";
  if (/sant[eé]|clinique|med|pharma/i.test(s)) return "sante";
  if (/tech|saas|logiciel|digital|it\b/i.test(s)) return "tech";
  if (/immobilier|real estate|construction/i.test(s)) return "immo";
  if (/mode|fashion|boutique/i.test(s)) return "mode";
  return "default";
}

function curatedPhoto(url: string, alt: string, index: number): StockPhoto {
  return {
    id: `curated_${index}`,
    provider: "unsplash",
    url,
    thumb: url.replace("w=1600", "w=400").replace("w=1200", "w=400"),
    alt,
    attribution: "Photo : Unsplash",
    attributionUrl: "https://unsplash.com",
  };
}

function partnerLogoSvg(name: string, accent: string): string {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="48" viewBox="0 0 140 48" role="img" aria-label="${name}">
  <rect width="140" height="48" rx="8" fill="#f8fafc"/>
  <rect x="8" y="8" width="32" height="32" rx="8" fill="${accent}"/>
  <text x="24" y="29" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="#fff">${initials}</text>
  <text x="48" y="29" font-family="system-ui,sans-serif" font-size="11" font-weight="600" fill="#1e293b">${name.replace(/&/g, "&amp;")}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function defaultPartners(sector: string, accentColor: string): SitePartner[] {
  const key = sectorKey(sector, "");
  const namesBySector: Record<string, string[]> = {
    default: ["Azur Group", "Kinex SA", "Nova Capital", "Helios Media", "Atlas Works"],
    resto: ["Saveurs Locales", "Gourmet HT", "Fresh Supply", "Cuisine Pro", "Terroir Co"],
    beaute: ["Glow Lab", "Studio Élégance", "Beauty Pro", "Luxe Care", "Style Co"],
    sante: ["MediCare Plus", "Bio Santé", "Clinique Réseau", "Vitalis", "Care Alliance"],
    tech: ["CloudSync", "DataFlow", "DevStack", "SecureNet", "ScaleUp"],
    immo: ["Prime Realty", "Urban Living", "Home Trust", "City Estates", "Landmark"],
    mode: ["Maison Élégance", "Style House", "Trend Co", "Luxe Mode", "Atelier 37"],
  };
  const names = namesBySector[key] ?? namesBySector.default;
  return names.slice(0, 5).map((name) => ({
    name,
    logoDataUrl: partnerLogoSvg(name, accentColor),
  }));
}

async function resolvePhotos(query: string, sector: string, brief: string, count: number): Promise<StockPhoto[]> {
  const fromApi = await searchStockPhotos(query, count);
  if (fromApi.length >= Math.min(2, count)) return fromApi.slice(0, count);

  const key = sectorKey(sector, brief);
  const urls = CURATED[key] ?? CURATED.default;
  const alt = query.slice(0, 80) || "Photo professionnelle";
  return urls.slice(0, count).map((url, i) => curatedPhoto(url, alt, i));
}

export async function buildSiteAssetBundle(input: {
  sector: string;
  brandName: string;
  siteType: string;
  brief: string;
  accentColor: string;
}): Promise<SiteAssetBundle> {
  const query = [input.sector, input.brandName, input.siteType].filter(Boolean).join(" ").trim() || input.brief.slice(0, 80) || "business professional";

  const [heroList, galleryList, aboutList] = await Promise.all([
    resolvePhotos(query, input.sector, input.brief, 1),
    resolvePhotos(`${query} workspace team`, input.sector, input.brief, 4),
    resolvePhotos(`${query} portrait professional`, input.sector, input.brief, 1),
  ]);

  const hero = heroList[0] ?? curatedPhoto(CURATED.default[0], query, 0);
  const gallery = galleryList.length ? galleryList : [hero];
  const about = aboutList[0] ?? null;
  const partners = defaultPartners(input.sector, input.accentColor);

  const attributions = [
    hero.attribution,
    ...gallery.map((p) => p.attribution),
    ...(about ? [about.attribution] : []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  return { hero, gallery, about, partners, attributions };
}

export function formatAssetsForPrompt(bundle: SiteAssetBundle): string {
  const lines = [
    "## Images obligatoires (URLs vérifiées — utiliser telles quelles)",
    `HERO : ${bundle.hero.url}`,
    `HERO alt : ${bundle.hero.alt}`,
    ...bundle.gallery.map((p, i) => `GALERIE_${i + 1} : ${p.url} (alt: ${p.alt})`),
  ];
  if (bundle.about) {
    lines.push(`À_PROPOS : ${bundle.about.url} (alt: ${bundle.about.alt})`);
  }
  lines.push("", "## Partenaires (logos obligatoires — section dédiée)");
  for (const p of bundle.partners) {
    lines.push(`- ${p.name} → logo src="${p.logoDataUrl}"`);
  }
  lines.push("", "Attributions photos (footer discret) :", bundle.attributions.join(" · "));
  return lines.join("\n");
}

/** Nettoie et renforce le HTML généré (images, CSP iframe, hero). */
export function polishGeneratedSiteHtml(html: string, bundle: SiteAssetBundle): string {
  let out = html
    .replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "")
    .replace(/<meta[^>]+http-equiv=["']X-Frame-Options["'][^>]*>/gi, "");

  const hasHeroImg =
    /<img[^>]+src=["'][^"']+["']/i.test(out.slice(0, 4000)) ||
    /background(?:-image)?:\s*url\(/i.test(out.slice(0, 4000));

  if (!hasHeroImg) {
    const heroBlock = `<figure class="klir-hero-img" style="margin:0;width:100%;max-height:420px;overflow:hidden"><img src="${bundle.hero.url}" alt="${escapeAttr(bundle.hero.alt)}" style="width:100%;height:420px;object-fit:cover;display:block" loading="eager"/></figure>`;
    out = out.replace(/<body([^>]*)>/i, `<body$1>${heroBlock}`);
  }

  out = out.replace(
    /<img([^>]*)\ssrc=["'](?:https?:\/\/(?:via\.placeholder|placehold\.co|dummyimage|picsum\.photos)[^"']*)["']/gi,
    `<img$1 src="${bundle.hero.url}"`
  );

  if (!/partenaire|partner|logo-partner|klir-partners/i.test(out)) {
    const partnersHtml = buildPartnersSectionHtml(bundle);
    out = out.replace(/<footer/i, `${partnersHtml}<footer`);
  }

  if (!out.includes("photo-credits") && bundle.attributions.length) {
    const credits = `<p class="photo-credits" style="font-size:11px;opacity:.55;margin:8px 0 0">${bundle.attributions.join(" · ")}</p>`;
    out = out.replace(/<\/footer>/i, `${credits}</footer>`);
  }

  return out;
}

function buildPartnersSectionHtml(bundle: SiteAssetBundle): string {
  const logos = bundle.partners
    .map(
      (p) =>
        `<li style="list-style:none;display:flex;align-items:center;justify-content:center;padding:12px 16px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08)"><img src="${p.logoDataUrl}" alt="${escapeAttr(p.name)}" height="40" style="height:40px;width:auto"/></li>`
    )
    .join("");
  return `<section class="klir-partners" style="padding:48px 24px;background:#f1f5f9"><div style="max-width:960px;margin:0 auto;text-align:center"><p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#64748b;margin:0 0 8px">Ils nous font confiance</p><h2 style="margin:0 0 24px;font-size:1.5rem">Nos partenaires</h2><ul style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;padding:0;margin:0">${logos}</ul></div></section>`;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

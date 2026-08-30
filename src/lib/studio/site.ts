import { chat } from "@/lib/ai/chat-provider";
import type { ChatTurn } from "@/lib/ai/types";
import { readEnv } from "@/lib/env";
import type { SiteWizardAnswers } from "@/lib/studio/site-wizard";
import { buildSiteBrief } from "@/lib/studio/site-wizard";
import {
  buildSiteAssetBundle,
  formatAssetsForPrompt,
  polishGeneratedSiteHtml,
} from "@/lib/studio/site-assets";
import { buildWebDesignProPrompt } from "@/lib/studio/web-design-pro";
import { DEFAULT_TEMPLATE_ID, getSiteTemplateMeta } from "@/lib/studio/templates/catalog";
import { buildTemplateContext, renderSiteTemplate } from "@/lib/studio/templates/render";

export type SiteGenerationMode = "template" | "ai";

export type StudioSiteResult = {
  html: string;
  title: string;
  templateId?: string;
  mode: SiteGenerationMode;
  hosting: {
    summary: string;
    steps: string[];
    dashboardUrl: string;
    wranglerHint: string;
  };
  provider: string;
};

const HOSTING = {
  summary:
    "Publiez sur Klirline : 500 HTG / 30 j — votre-nom.sites.klirline.io (sans acheter de .com)",
  steps: [
    "Générez votre site ci-dessus.",
    "Choisissez votre nom d'URL (ex. mon-salon).",
    "Payez l'hébergement Klirline (MonCash, Stripe ou USDT).",
    "Votre site est en ligne immédiatement après paiement.",
  ],
  dashboardUrl: "https://klirline.io/dashboard/sites",
  wranglerHint: "",
};

function siteMaxTokens(): number {
  const n = Number(readEnv("AI_SITE_MAX_TOKENS"));
  return Number.isFinite(n) && n >= 4096 ? n : 8192;
}

function extractHtml(raw: string): string {
  let html = raw.trim();
  const fence = html.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fence) html = fence[1].trim();
  return html;
}

function isHtmlComplete(html: string): boolean {
  const trimmed = html.trim();
  return /<\/html>\s*$/i.test(trimmed) && /<\/body>/i.test(trimmed);
}

async function generateSiteHtml(input: {
  system: string;
  userContent: string;
  fullBrief: string;
  fallbackContent: string;
}): Promise<{ html: string; provider: string }> {
  const maxTokens = siteMaxTokens();
  const baseMessages: ChatTurn[] = [{ role: "user", content: input.userContent }];

  const result = await chat({
    system: input.system,
    messages: baseMessages,
    maxTokens,
    skipHumanize: true,
    skipEnrich: true,
  });

  let html = extractHtml(result.content);
  if (!html.toLowerCase().includes("<!doctype") && !html.toLowerCase().includes("<html")) {
    html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Landing Klir IA</title><style>body{font-family:system-ui;margin:0;background:#F7F5F0;color:#1a1a1a}header{background:#004F6E;color:#fff;padding:3rem 1.5rem;text-align:center}a.btn{display:inline-block;margin-top:1rem;background:#D4AF37;color:#004F6E;padding:.75rem 1.25rem;border-radius:.5rem;text-decoration:none;font-weight:600}main{max-width:720px;margin:0 auto;padding:2rem 1.25rem}</style></head><body><header><h1>Landing générée</h1><p>${input.fullBrief.slice(0, 200).replace(/</g, "")}</p><a class="btn" href="https://klirline.io">Découvrir</a></header><main><pre style="white-space:pre-wrap">${input.fallbackContent.slice(0, 4000).replace(/</g, "&lt;")}</pre></main></body></html>`;
  }

  if (!isHtmlComplete(html)) {
    const tail = html.slice(-6000);
    const continuation = await chat({
      system:
        "Tu continues un fichier HTML coupé par limite de tokens. Reprends EXACTEMENT à la fin du fragment sans répéter le début. Termine impérativement par </body></html>. Réponds UNIQUEMENT avec la suite HTML (pas de markdown).",
      messages: [
        { role: "user", content: input.userContent },
        { role: "assistant", content: tail },
        {
          role: "user",
          content:
            "Le HTML a été tronqué. Continue exactement où tu t'es arrêté et ferme </style> (si ouvert), </head>, le contenu <body> manquant, puis </body></html>.",
        },
      ],
      maxTokens,
      skipHumanize: true,
      skipEnrich: true,
    });
    html = html + extractHtml(continuation.content);
  }

  return { html, provider: result.provider };
}

export async function generateSiteFromTemplate(
  answers: SiteWizardAnswers
): Promise<StudioSiteResult> {
  const templateId = getSiteTemplateMeta(answers.templateId)?.id ?? DEFAULT_TEMPLATE_ID;
  const fullBrief = buildSiteBrief(answers);

  const assets = await buildSiteAssetBundle({
    sector: answers.sector,
    brandName: answers.brandName,
    siteType: answers.siteType,
    brief: fullBrief,
    accentColor: answers.accentColor,
  });

  const ctx = buildTemplateContext(answers, assets);
  const html = renderSiteTemplate(templateId, ctx, answers);
  const title = answers.brandName.trim() || getSiteTemplateMeta(templateId)?.name || "Site Klir IA";

  return {
    html,
    title,
    templateId,
    mode: "template",
    hosting: HOSTING,
    provider: "template-free",
  };
}

export async function generateStudioSite(
  brief: string,
  answers?: SiteWizardAnswers,
  options?: { mode?: SiteGenerationMode }
): Promise<StudioSiteResult> {
  const mode = options?.mode ?? "ai";

  if (answers && mode === "template") {
    return generateSiteFromTemplate(answers);
  }

  const fullBrief = answers ? buildSiteBrief(answers) : brief;
  const a = answers ?? {
    siteType: "landing",
    brandName: "",
    sector: "",
    tone: "corporate",
    primaryColor: "#004F6E",
    accentColor: "#D4AF37",
  } as SiteWizardAnswers;

  const assets = await buildSiteAssetBundle({
    sector: a.sector,
    brandName: a.brandName,
    siteType: a.siteType,
    brief: fullBrief,
    accentColor: a.accentColor,
  });

  const system = buildWebDesignProPrompt({
    siteType: a.siteType,
    sector: a.sector,
    tone: a.tone,
    primaryColor: a.primaryColor,
    accentColor: a.accentColor,
    brandName: a.brandName,
  });

  const userContent = `Brief site :\n${fullBrief.slice(0, 3500)}\n\n${formatAssetsForPrompt(assets)}`;

  const { html: rawHtml, provider } = await generateSiteHtml({
    system,
    userContent,
    fullBrief,
    fallbackContent: userContent,
  });

  let html = rawHtml;
  html = polishGeneratedSiteHtml(html, assets);

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return {
    html,
    title: titleMatch?.[1]?.trim() || "Site Klir IA",
    templateId: answers?.templateId,
    mode: "ai",
    hosting: HOSTING,
    provider,
  };
}

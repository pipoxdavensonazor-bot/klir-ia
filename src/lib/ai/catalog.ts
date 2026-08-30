import type { SkillDetail, SkillMeta } from "./types";
import { IDENTITY, PRODUCT_MARKETING, SKILLS_DATA, TRADING_TOOLKIT } from "./skills-data";

const CATEGORY_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(SKILLS_DATA).map(([k, v]) => [k, v.category])
);

export function getIdentity(): string {
  return IDENTITY;
}

export function getProductMarketing(): string {
  return PRODUCT_MARKETING;
}

export function listSkills(): SkillMeta[] {
  return Object.entries(SKILLS_DATA)
    .map(([key, s]) => ({
      name: s.name || key,
      description: s.description,
      category: s.category,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getSkill(name: string): SkillDetail | null {
  const s = SKILLS_DATA[name];
  if (!s) return null;
  return {
    name: s.name || name,
    description: s.description,
    body: s.body,
    category: s.category,
  };
}

export function detectSkill(message: string, skills: SkillMeta[]): string | null {
  const lower = message.toLowerCase();

  const rules: [RegExp, string][] = [
    [/geo|aeo|ai overview|citation.?ia|answer.?first|perplexity|visibilité llm/, "geo-aeo"],
    [/fact.?check|vérifier.?source|grounding|hallucin|claim check|ne pas inventer/, "fact-check"],
    [/evaluat|eval suite|llm.?as.?judge|golden set|régression.?qualité|score.?réponse/, "evaluation"],
    [
      /approval|hitl|human.?in.?the.?loop|confirmer avant|gate.?publish|avant envoi|ne me (re)?demande|(?:publie[rz]?|envoie[rz]?|poste[rz]?).{0,60}(?:tout de suite|maintenant|immédiat)/,
      "approval-gates",
    ],
    [/brand.?voice|voix de marque|style guide|ton de marque|guidelines rédac/, "brand-voice"],
    [/tool.?design|mcp tool|schema.?outil|function.?calling|contrat.?outil/, "tool-design"],
    [/stop\s*slop|anti-slop|kill\s*slop|trop générique|cliché.?ia|sonne chatgpt/, "stop-slop"],
    [/context\s*engineer|system\s*prompt|ingénierie de contexte|context window|briefing ia/, "context-engineer"],
    [/remotion|vidéo react|motion graphics|composition remotion/, "remotion"],
    [/ui\s*ux|ux design|wireframe|user flow|design system|critique ui|figma|pro max ui/, "ui-ux-pro-max"],
    [/humanis|naturel|moins ia|robotique/, "humaniser-texte"],
    [/copy|landing|headline|cta|accroche|page web/, "copywriting"],
    [/klirline|forfait|pricing klir|produit klir/, "klirline-produits"],
    [/linkedin|instagram|tiktok|twitter|réseau|social|post|thread/, "social"],
    [/email|séquence|drip|newsletter|nurture|promo mail/, "emails"],
    [/flyer|affichette|visuel promo|affiche/, "ad-creative"],
    [/mockup|maquette produit|packshot|rendu produit/, "image"],
    [/site web|landing page|mini.?site|héberge(r|ment)|cloudflare pages/, "ui-ux-pro-max"],
    [/unsplash|pexels|banque.?image|photo.?gratuite|stock.?photo/, "image"],
    [/seo|référencement|meta tag|indexation/, "seo-audit"],
    [/stratégie contenu|calendrier éditorial|piliers/, "content-strategy"],
    [/positionnement|messaging|value prop/, "product-marketing"],
    [/lancement|launch|go-to-market/, "launch"],
    [/cold.?email|outreach|prospection|email froid|sdr\b|outbound email/, "cold-email"],
    [/\bcro\b|conversion rate|taux de conversion|page ne convert|landing.*convert|form abandon/, "cro"],
    [/analytics|ga4|dashboard marketing|funnel|kpi marketing|mesure marketing/, "analytics"],
    [/a\/b test|split test|variante|test ab\b|multivari/, "ab-testing"],
    [/parrainage|referral program|word of mouth|bouche.?à.?oreille/, "referrals"],
    [/lead magnet|aimant.?lead|ebook gratuit|gated content|checklist pdf/, "lead-magnets"],
    [/programmatic seo|pseo|pages template seo/, "programmatic-seo"],
    [/churn|cancel flow|win.?back|rétention client|désabonn/, "churn-prevention"],
    [/revops|revenue ops|pipeline sales|forecast sales/, "revops"],
    [/prospection|outbound|icp targeting|prospect list/, "prospecting"],
    [/schema\.org|json-ld|rich snippet|structured data|données structurées/, "schema"],
    [/influenceur|creator partnership|ugc creator|partenariat créateur/, "influencer-marketing"],
    [/communiqué|relations presse|\bpr\b|earned media|pitch presse/, "public-relations"],
    [/sms marketing|text marketing|opt-in sms|campagnes sms/, "sms"],
    [/onboarding|activation utilisateur|first.?run|première connexion produit/, "onboarding"],
    [/paywall|upgrade flow|freemium convert|monétiser free/, "paywalls"],
    [/popup|exit intent|modal capture|interstitiel/, "popups"],
    [/concurrent|competitor|veille concurrent|battlecard/, "competitors"],
    [/marketing plan|roadmap marketing|budget marketing annuel/, "marketing-plan"],
    [/growth loop|viral loop|flywheel|boucle de croissance/, "marketing-loops"],
    [/psychologie consommateur|persuasion marketing|bias marketing|ancrage prix/, "marketing-psychology"],
    [/offre irrésistible|value stack|stack d'offre|garantie satisf/, "offers"],
    [/copy edit|relecture copy|polish copy|réviser le texte|corriger copy/, "copy-editing"],
    [/customer research|jobs.to.be.done|voix client|interview client/, "customer-research"],
    [/webinar|conférence|événement marketing|event marketing/, "events"],
    [/app store|play store|\baso\b|keywords app store/, "aso"],
    [/attribution|utm|multi-touch|roi canal/, "attribution"],
    [/community marketing|discord community|forum brand|ambassadeur/, "community-marketing"],
    [/sales enablement|pitch deck sales|script vente|deck commercial/, "sales-enablement"],
    [/pub |ads |publicité|meta ads|google ads/, "ads"],
    [/prix|pricing|forfait/, "pricing"],
    [
      /trading|trade\b|analyse.?march|market.?analysis|pronostic|btc|bitcoin|eth\b|ethereum|crypto|forex|eur\/usd|usd\/htg|xau|or\b|gold|action\b|bourse|aapl|tsla|support|résistance|bear|bull|haussier|baissier|fear.?&.?greed/i,
      "market-analysis",
    ],
    [/briefing march|résumé crypto|trading summary|marché aujourd|what happened/i, "trading-summary"],
    [
      /backtest|backtesting|sharpe|sortino|drawdown|tear sheet|quantstats|backtrader/i,
      "trading-backtest",
    ],
    [/order block|fair value gap|\bfvg\b|smart money|\bsmc\b|\bict\b|choch|\bbos\b|liquidity sweep/i, "trading-smart-money"],
    [/rsi\b|macd|bollinger|supertrend|chandelier|pattern bougie|ta-lib|pandas-ta|indicateur/i, "trading-technical"],
    [/nfp\b|calendrier économique|forex factory|macro\b|fondamental|fed\b|bce\b|cpi\b/i, "trading-fundamental"],
    [/kelly|position sizing|riskfolio|money management|gestion du risque|taille position/i, "trading-risk"],
    [/metatrader|\bmt5\b|metaquotes/i, "trading-mt5"],
    [/options binaires|binary option|expiry|otc broker/i, "trading-binary-options"],
    [/script trading|stratégie python|yfinance|détecte.*fvg|pipeline analyse/i, "trading-analysis-studio"],
  ];

  for (const [re, skill] of rules) {
    if (re.test(lower) && skills.some((s) => s.name === skill || SKILLS_DATA[skill])) return skill;
  }

  return null;
}

export function buildSystemPrompt(
  skillName?: string,
  extras?: { memoryNote?: string; attachmentsNote?: string; marketNote?: string }
): string {
  const parts = [getIdentity()];

  if (skillName) {
    const skill = getSkill(skillName);
    if (skill) parts.push(`\n## Skill actif : ${skill.name}\n\n${skill.body}`);
  } else {
    parts.push(
      "\n## Routage\nAnalyse la demande et applique le skill le plus pertinent du catalogue Klir IA. Si ambiguë, commence par skill-router."
    );
  }

  const pm = getProductMarketing();
  if (pm && (skillName === "klirline-produits" || skillName === "product-marketing" || skillName === "copywriting")) {
    parts.push(`\n## Contexte produit Klirline\n${pm.slice(0, 4000)}`);
  }

  if (skillName === "emails" || (!skillName && /email|newsletter|promo/i.test(extras?.memoryNote || ""))) {
    parts.push(
      "\n## Liens cliquables (emails)\nToujours écrire les URL en Markdown `[texte du bouton](https://exemple.com)`. Jamais d'URL nues seules dans un email promo — le lecteur doit pouvoir cliquer."
    );
  }
  if (skillName === "emails") {
    parts.push(
      "\n## Format email promo\nInclure : objet, préheader, corps, 1–2 CTA Markdown cliquables, PS court. HTML optionnel en bloc code si demandé."
    );
  }

  if (extras?.memoryNote) {
    parts.push(`\n## Mémoire des recherches précédentes\n${extras.memoryNote}`);
  }
  if (extras?.attachmentsNote) {
    parts.push(extras.attachmentsNote);
  }
  if (extras?.marketNote) {
    parts.push(`\n## Données marché live (CoinGecko / Alpha Vantage / Fear & Greed)\n${extras.marketNote}`);
    parts.push(
      "\n## Obligation trading\nTermine toute analyse marché par un avertissement clair : contenu informatif uniquement, pas conseil en investissement, risque de perte."
    );
  }

  const TRADING_SKILLS = new Set([
    "market-analysis",
    "trading-summary",
    "trading-analysis-studio",
    "trading-technical",
    "trading-smart-money",
    "trading-backtest",
    "trading-fundamental",
    "trading-risk",
    "trading-mt5",
    "trading-binary-options",
  ]);
  if (skillName && TRADING_SKILLS.has(skillName) && TRADING_TOOLKIT) {
    parts.push(`\n## Trading toolkit (références open-source)\n${TRADING_TOOLKIT.slice(0, 3500)}`);
  }

  parts.push(
    "\n## Studio\nSi on demande un flyer/mockup/site, fournis le brief texte prêt à générer ; le client Klir IA peut aussi produire l'image ou le HTML via le studio intégré."
  );

  return parts.join("\n");
}

// re-export for type compatibility
export { CATEGORY_MAP };

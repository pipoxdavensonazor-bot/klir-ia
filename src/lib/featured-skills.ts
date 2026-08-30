export const FEATURED_SKILLS: { id: string; label: string }[] = [
  { id: "copywriting", label: "Copy" },
  { id: "geo-aeo", label: "GEO" },
  { id: "humaniser-texte", label: "Humaniser" },
  { id: "stop-slop", label: "Stop Slop" },
  { id: "brand-voice", label: "Voix" },
  { id: "fact-check", label: "Faits" },
  { id: "trading-analysis-studio", label: "Trading" },
  { id: "market-analysis", label: "Marché" },
  { id: "web-design-studio", label: "Site pro" },
  { id: "ui-ux-pro-max", label: "UI/UX" },
  { id: "context-engineer", label: "Contexte" },
  { id: "klirline-produits", label: "Produits" },
];

/** null = Auto (routage skill) */
export type ActiveSkillId = string | null;

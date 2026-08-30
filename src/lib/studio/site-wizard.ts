/** Questionnaire guidé détaillé — création de site Klir IA */

import { DEFAULT_TEMPLATE_ID } from "@/lib/studio/templates/catalog";

export type SiteWizardAnswers = {
  templateId: string;
  siteType: string;
  brandName: string;
  tagline: string;
  sector: string;
  audience: string;
  objective: string;
  sections: string[];
  tone: string;
  businessCity: string;
  contactEmail: string;
  contactPhone: string;
  whatsapp: string;
  language: string;
  ctaText: string;
  ctaUrl: string;
  primaryColor: string;
  accentColor: string;
  extraNotes: string;
  businessCountry: string;
};

export const SITE_TYPE_OPTIONS = [
  {
    id: "landing",
    label: "Landing page",
    hint: "Une page unique orientée conversion",
    detail: "Idéal pour lancer une offre, capturer des leads ou promouvoir un service.",
    features: ["Hero + CTA fort", "Preuve sociale", "Formulaire ou contact"],
    idealFor: "Campagnes, lancements, PME locales",
  },
  {
    id: "portfolio",
    label: "Portfolio",
    hint: "Mettre en valeur vos réalisations",
    detail: "Présentez projets, études de cas et compétences avec une galerie visuelle.",
    features: ["Galerie projets", "Bio / à propos", "Contact direct"],
    idealFor: "Créatifs, freelances, agences",
  },
  {
    id: "boutique",
    label: "Boutique / produit",
    hint: "Vendre ou présenter un catalogue",
    detail: "Mettez vos produits en avant avec prix, bénéfices et appels à l'achat.",
    features: ["Fiches produit", "Tarifs visibles", "Paiement (MonCash, Stripe…)"],
    idealFor: "E-commerce, artisans, marques DTC",
  },
  {
    id: "evenement",
    label: "Événement",
    hint: "Inscriptions, billetterie ou RSVP",
    detail: "Programme, speakers, date et lieu — incitez à réserver une place.",
    features: ["Programme / agenda", "Speakers", "Bouton S'inscrire"],
    idealFor: "Conférences, galas, ateliers, mariages",
  },
  {
    id: "services",
    label: "Services pro",
    hint: "PME, consultant, agence B2B",
    detail: "Crédibilisez votre expertise et facilitez la prise de rendez-vous.",
    features: ["Offres / forfaits", "Témoignages", "FAQ + contact"],
    idealFor: "Consultants, cliniques, agences, B2B",
  },
] as const;

export const SECTOR_GROUPS = [
  {
    label: "Commerce & local",
    items: [
      { id: "resto", label: "Restauration & bar", example: "Restaurant, café, traiteur" },
      { id: "retail", label: "Commerce de détail", example: "Boutique, mode, épicerie" },
      { id: "beaute", label: "Beauté & bien-être", example: "Salon, spa, coiffure" },
      { id: "artisan", label: "Artisanat", example: "Menuiserie, bijoux, décoration" },
    ],
  },
  {
    label: "Services & pro",
    items: [
      { id: "consulting", label: "Conseil & agence", example: "Marketing, juridique, comptabilité" },
      { id: "sante", label: "Santé", example: "Clinique, dentiste, pharmacie" },
      { id: "immo", label: "Immobilier", example: "Agence, promoteur, location" },
      { id: "education", label: "Formation", example: "École, cours en ligne, coaching" },
    ],
  },
  {
    label: "Tech & créatif",
    items: [
      { id: "saas", label: "SaaS & tech", example: "Application, outil B2B, startup" },
      { id: "creatif", label: "Créatif & média", example: "Photo, vidéo, design, musique" },
      { id: "evenementiel", label: "Événementiel", example: "Organisateur, DJ, location salle" },
      { id: "ong", label: "ONG & communauté", example: "Association, fondation, collecte" },
    ],
  },
] as const;

export const AUDIENCE_OPTIONS = [
  {
    id: "local",
    label: "Clients locaux",
    hint: "Quartier, ville, région — proximité et confiance",
    examples: "Familles, voisins, passants du commerce",
  },
  {
    id: "b2b",
    label: "Entreprises (B2B)",
    hint: "Décideurs, PME, institutions",
    examples: "Directeurs, acheteurs, partenaires pro",
  },
  {
    id: "jeunes",
    label: "Jeunes & tendance",
    hint: "18–35 ans, mobile-first, réseaux sociaux",
    examples: "Étudiants, early adopters, créateurs",
  },
  {
    id: "premium",
    label: "Clientèle premium",
    hint: "Luxe, discrétion, service haut de gamme",
    examples: "Cadres, expatriés, clientèle VIP",
  },
  {
    id: "mixte",
    label: "Grand public",
    hint: "Audience large, message simple et clair",
    examples: "Tous âges, familles, visiteurs en ligne",
  },
] as const;

export const OBJECTIVE_OPTIONS = [
  {
    id: "leads",
    label: "Collecter des leads",
    hint: "Formulaire, appel, WhatsApp — transformer les visiteurs en contacts",
    kpi: "Nombre de demandes / semaine",
    ctaSuggestion: "Demander un devis",
  },
  {
    id: "ventes",
    label: "Vendre un produit / service",
    hint: "Mettre l'offre en avant et réduire la friction à l'achat",
    kpi: "Conversions & panier moyen",
    ctaSuggestion: "Commander maintenant",
  },
  {
    id: "inscription",
    label: "Inscriptions / RSVP",
    hint: "Places limitées, urgence douce, calendrier visible",
    kpi: "Inscriptions confirmées",
    ctaSuggestion: "Réserver ma place",
  },
  {
    id: "info",
    label: "Informer / crédibiliser",
    hint: "Présence pro, réassurance, pas de vente agressive",
    kpi: "Temps sur page & partages",
    ctaSuggestion: "En savoir plus",
  },
  {
    id: "rdv",
    label: "Prise de rendez-vous",
    hint: "Calendrier, disponibilités, contact direct",
    kpi: "Rendez-vous bookés",
    ctaSuggestion: "Prendre rendez-vous",
  },
] as const;

export type SectionOption = {
  id: string;
  label: string;
  hint: string;
  recommended?: boolean;
};

export const SECTION_OPTIONS: SectionOption[] = [
  {
    id: "hero",
    label: "Hero accrocheur",
    hint: "Titre, sous-titre, photo plein écran et CTA principal",
    recommended: true,
  },
  {
    id: "benefits",
    label: "Bénéfices / avantages",
    hint: "3 raisons de vous choisir — claires et concrètes",
    recommended: true,
  },
  {
    id: "partners",
    label: "Partenaires / logos",
    hint: "Marques, certifications, médias — preuve de confiance",
  },
  {
    id: "testimonials",
    label: "Témoignages",
    hint: "Avis clients avec nom et rôle — crédibilité sociale",
  },
  {
    id: "pricing",
    label: "Tarifs / forfaits",
    hint: "Grille de prix ou packs — comparables en un coup d'œil",
  },
  {
    id: "faq",
    label: "FAQ",
    hint: "Réponses aux objections fréquentes avant le contact",
  },
  {
    id: "about",
    label: "À propos",
    hint: "Histoire, équipe, valeurs — humaniser la marque",
  },
  {
    id: "contact",
    label: "Contact / formulaire",
    hint: "Email, téléphone, WhatsApp, carte ou formulaire",
    recommended: true,
  },
  {
    id: "gallery",
    label: "Galerie photos",
    hint: "Portfolio visuel, produits, ambiance lieu",
  },
  {
    id: "stats",
    label: "Chiffres clés",
    hint: "KPIs : clients servis, années d'expérience, satisfaction",
  },
  {
    id: "process",
    label: "Comment ça marche",
    hint: "Étapes 1-2-3 du parcours client",
  },
];

export const TONE_OPTIONS = [
  {
    id: "corporate",
    label: "Corporate & pro",
    hint: "Grille nette, confiance, sérieux — B2B et institutions",
    mood: "Swiss · Data-dense · crédible",
  },
  {
    id: "creatif",
    label: "Créatif & audacieux",
    hint: "Contrastes forts, composition inattendue — se démarquer",
    mood: "Vibrant · Brutalist · mémorable",
  },
  {
    id: "minimal",
    label: "Minimal & épuré",
    hint: "Whitespace, typo forte — laisser respirer le contenu",
    mood: "Editorial · zen · premium discret",
  },
  {
    id: "luxe",
    label: "Premium / luxe",
    hint: "Fond sombre, accents métalliques — haute couture, immo haut de gamme",
    mood: "Dark OLED · élégant · exclusif",
  },
  {
    id: "chaleureux",
    label: "Chaleureux & humain",
    hint: "Tons terreux, voix proche — resto, santé, services locaux",
    mood: "Warm · organic · accueillant",
  },
  {
    id: "tech",
    label: "Tech & futuriste",
    hint: "Dégradés, glass, SaaS — startups et produits digitaux",
    mood: "Aurora · glass · innovant",
  },
] as const;

export const CTA_PRESETS = [
  { id: "quote", label: "Devis", text: "Demander un devis", url: "#contact" },
  { id: "buy", label: "Achat", text: "Commander maintenant", url: "#acheter" },
  { id: "book", label: "Réservation", text: "Réserver", url: "#reserver" },
  { id: "call", label: "Appel", text: "Nous appeler", url: "tel:" },
  { id: "whatsapp", label: "WhatsApp", text: "Écrire sur WhatsApp", url: "https://wa.me/" },
  { id: "signup", label: "Inscription", text: "S'inscrire", url: "#inscription" },
] as const;

export const LANGUAGE_OPTIONS = [
  { id: "fr-CA", label: "Français (Canada)", hint: "fr-CA — Québec, Montréal" },
  { id: "fr-HT", label: "Français (Haïti)", hint: "fr-HT — Port-au-Prince, provinces" },
  { id: "fr-FR", label: "Français (France)", hint: "fr-FR — métropole" },
  { id: "en-US", label: "English (US)", hint: "en-US — international" },
  { id: "es", label: "Español", hint: "es — Amérique latine & Caraïbes" },
] as const;

export const WIZARD_STEPS = [
  { id: "template", title: "Template", question: "Quel design pour votre site ?" },
  { id: "type", title: "Type", question: "Quel type de site correspond à votre projet ?" },
  { id: "brand", title: "Marque", question: "Comment s'appelle votre marque ?" },
  { id: "sector", title: "Secteur", question: "Dans quel secteur évoluez-vous ?" },
  { id: "audience", title: "Audience", question: "Qui sont vos clients idéaux ?" },
  { id: "objective", title: "Objectif", question: "Quel résultat voulez-vous obtenir ?" },
  { id: "sections", title: "Sections", question: "Quelles sections inclure sur la page ?" },
  { id: "tone", title: "Ton visuel", question: "Quelle ambiance visuelle souhaitez-vous ?" },
  { id: "contact", title: "Contact", question: "Comment vos clients vous joignent ?" },
  { id: "cta", title: "Action", question: "Quel bouton principal (CTA) afficher ?" },
  { id: "style", title: "Style", question: "Couleurs, langue et notes finales" },
] as const;

export function defaultSiteWizardAnswers(): SiteWizardAnswers {
  return {
    templateId: DEFAULT_TEMPLATE_ID,
    siteType: "landing",
    brandName: "",
    tagline: "",
    sector: "",
    audience: "local",
    objective: "leads",
    sections: ["hero", "benefits", "partners", "contact"],
    tone: "corporate",
    businessCity: "",
    contactEmail: "",
    contactPhone: "",
    whatsapp: "",
    language: "fr-CA",
    ctaText: "Demander un devis",
    ctaUrl: "#contact",
    primaryColor: "#004F6E",
    accentColor: "#D4AF37",
    extraNotes: "",
    businessCountry: "HT",
  };
}

function labelFor<T extends { id: string; label: string }>(options: readonly T[], id: string): string {
  return options.find((o) => o.id === id)?.label ?? id;
}

function sectionLabels(ids: string[]): string {
  return ids
    .map((id) => SECTION_OPTIONS.find((s) => s.id === id)?.label ?? id)
    .join(", ");
}

export function buildSiteBrief(answers: SiteWizardAnswers): string {
  const typeOpt = SITE_TYPE_OPTIONS.find((o) => o.id === answers.siteType);
  const objOpt = OBJECTIVE_OPTIONS.find((o) => o.id === answers.objective);
  const toneOpt = TONE_OPTIONS.find((o) => o.id === answers.tone);
  const audOpt = AUDIENCE_OPTIONS.find((o) => o.id === answers.audience);
  const langOpt = LANGUAGE_OPTIONS.find((o) => o.id === answers.language);

  return [
    `Template : ${answers.templateId}`,
    `Type : ${typeOpt?.label ?? answers.siteType} — ${typeOpt?.detail ?? ""}`,
    `Marque : ${answers.brandName}`,
    answers.tagline ? `Slogan : ${answers.tagline}` : "",
    `Secteur : ${answers.sector}`,
    `Audience : ${audOpt?.label ?? answers.audience} (${audOpt?.hint ?? ""})`,
    `Objectif : ${objOpt?.label ?? answers.objective} — KPI : ${objOpt?.kpi ?? ""}`,
    `Sections : ${sectionLabels(answers.sections)}`,
    `Ton : ${toneOpt?.label ?? answers.tone} (${toneOpt?.mood ?? ""})`,
    `Langue du site : ${langOpt?.label ?? answers.language}`,
    answers.businessCity ? `Ville : ${answers.businessCity}` : "",
    answers.contactEmail ? `Email : ${answers.contactEmail}` : "",
    answers.contactPhone ? `Téléphone : ${answers.contactPhone}` : "",
    answers.whatsapp ? `WhatsApp : ${answers.whatsapp}` : "",
    `Pays : ${answers.businessCountry}`,
    `CTA : « ${answers.ctaText} » → ${answers.ctaUrl}`,
    `Couleurs : primaire ${answers.primaryColor}, accent ${answers.accentColor}`,
    answers.extraNotes ? `Notes : ${answers.extraNotes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function validateWizardStep(step: number, answers: SiteWizardAnswers): string | null {
  if (step === 0 && !answers.templateId.trim()) return "Choisissez un template.";
  if (step === 1 && !answers.siteType.trim()) return "Choisissez un type de site.";
  if (step === 2 && !answers.brandName.trim()) return "Indiquez le nom de la marque.";
  if (step === 3 && !answers.sector.trim()) return "Choisissez ou saisissez votre secteur.";
  if (step === 4 && !answers.audience.trim()) return "Indiquez votre audience cible.";
  if (step === 5 && !answers.objective.trim()) return "Choisissez un objectif principal.";
  if (step === 6 && answers.sections.length === 0) return "Choisissez au moins une section.";
  if (step === 7 && !answers.tone.trim()) return "Choisissez un ton visuel.";
  if (step === 9) {
    if (!answers.ctaText.trim()) return "Texte du bouton requis.";
    if (!answers.ctaUrl.trim()) return "Lien du CTA requis.";
  }
  return null;
}

/** Applique un preset CTA selon l'objectif choisi */
export function suggestedCtaForObjective(objective: string): { text: string; url: string } {
  const obj = OBJECTIVE_OPTIONS.find((o) => o.id === objective);
  return {
    text: obj?.ctaSuggestion ?? "Commencer",
    url: objective === "ventes" ? "#acheter" : "#contact",
  };
}

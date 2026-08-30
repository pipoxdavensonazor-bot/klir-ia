/** Forfaits Klir IA — accès par durée · Stripe / MonCash / USDT. */

import { getCreditPublicConfig, getCreditsPerAction, getFreeCredits } from "@/lib/billing/credit-config";

export type PlanId = "free" | "pass24h" | "pass7d" | "pass30d";
export type PaymentMethod = "stripe" | "moncash" | "usdt";

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  /** Prix affiché en gourdes haïtiennes */
  htg: number;
  /** Prix Stripe (USD, one-time) */
  usd: number;
  /** Durée d'accès en millisecondes */
  durationMs: number;
  durationLabel: string;
  features: string[];
  highlighted?: boolean;
  /** Accès API intégration incluse */
  apiAccess: boolean;
  support?: boolean;
};

/** @deprecated Préférez getFreeCredits() — valeur runtime via FREE_CREDITS. */
export const FREE_CREDITS = getFreeCredits();

const H = 60 * 60 * 1000;
const D = 24 * H;

function buildPlans(): Plan[] {
  const credit = getCreditPublicConfig();
  return [
    {
      id: "free",
      name: "Gratuit",
      tagline: "Découvrir Klir IA",
      htg: 0,
      usd: 0,
      durationMs: 0,
      durationLabel: "Sans engagement",
      apiAccess: false,
      features: [
        credit.freeCreditsLabel,
        credit.refillLabel,
        "1 crédit / recherche",
        "3 recherches sans compte",
        "~92 skills marketing",
      ],
    },
  {
    id: "pass24h",
    name: "24 heures",
    tagline: "Sprint créatif",
    htg: 250,
    usd: 2,
    durationMs: D,
    durationLabel: "24 h",
    apiAccess: true,
    features: [
      "Chat illimité 24 h",
      "Sites HTML pro (Studio + chat)",
      "Analyses trading complètes",
      "Clé API intégration",
    ],
  },
  {
    id: "pass7d",
    name: "1 semaine",
    tagline: "Cadence studio",
    htg: 500,
    usd: 4,
    durationMs: 7 * D,
    durationLabel: "7 jours",
    highlighted: true,
    apiAccess: true,
    features: [
      "Chat illimité 7 jours",
      "Sites HTML pro + trading complet",
      "Pièces jointes + R2",
      "−10 % sur les domaines",
    ],
  },
  {
    id: "pass30d",
    name: "1 mois",
    tagline: "Volume pro",
    htg: 2500,
    usd: 19,
    durationMs: 30 * D,
    durationLabel: "30 jours",
    support: true,
    apiAccess: true,
    features: [
      "Chat illimité 30 jours",
      "Sites HTML pro + trading complet",
      "Support Klirline",
      "−10 % domaines · hébergement à part",
    ],
  },
  ];
}

export function getPlans(): Plan[] {
  return buildPlans();
}

export const PLANS: Plan[] = buildPlans();

export function getPlan(id: string): Plan | undefined {
  return getPlans().find((p) => p.id === id);
}

export function paidPlans(): Plan[] {
  return getPlans().filter((p) => p.id !== "free");
}

/** Coût d’un tour de chat (crédits) — ignoré si forfait actif. */
export const CREDITS_PER_MESSAGE = getCreditsPerAction();

/** Taux HTG → USDT (ex. 130 HTG = 1 USDT). Configurable via secret. */
export function htgToUsdt(htg: number, rate: number): number {
  if (rate <= 0) return 0;
  return Math.round((htg / rate) * 100) / 100;
}

import { readEnv } from "@/lib/env";
import {
  formatPricingSummary,
  getCreditPricingConfig,
  type CreditPricingConfig,
} from "@/lib/billing/credit-pricing";

const DEFAULT_FREE_CREDITS = 45;
const DEFAULT_CREDITS_PER_ACTION = 6;
const DEFAULT_FREE_REFILL_HOURS = 5;

function parsePositiveInt(raw: string, fallback: number): number {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function parsePositiveFloat(raw: string, fallback: number): number {
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Crédits offerts à l'inscription (configurable via FREE_CREDITS). */
export function getFreeCredits(): number {
  return parsePositiveInt(readEnv("FREE_CREDITS"), DEFAULT_FREE_CREDITS);
}

/** Intervalle de recharge gratuite en heures (FREE_CREDITS_REFILL_HOURS). */
export function getFreeCreditsRefillHours(): number {
  return parsePositiveFloat(readEnv("FREE_CREDITS_REFILL_HOURS"), DEFAULT_FREE_REFILL_HOURS);
}

export function getFreeCreditsRefillMs(): number {
  return Math.round(getFreeCreditsRefillHours() * 60 * 60 * 1000);
}

/** Coût minimal par action (legacy / fallback). */
export function getCreditsPerAction(): number {
  return parsePositiveInt(readEnv("CREDITS_PER_ACTION"), DEFAULT_CREDITS_PER_ACTION);
}

export function formatCredits(amount: number): string {
  return amount.toLocaleString("fr-CA");
}

export type CreditPublicConfig = {
  freeCredits: number;
  creditsPerAction: number;
  refillHours: number;
  freeCreditsLabel: string;
  registrationLabel: string;
  refillLabel: string;
  costLabel: string;
  pricing: CreditPricingConfig;
  pricingLabel: string;
  estimateSearchesLabel: string;
};

export function getCreditPublicConfig(): CreditPublicConfig {
  const freeCredits = getFreeCredits();
  const creditsPerAction = getCreditsPerAction();
  const refillHours = getFreeCreditsRefillHours();
  const pricing = getCreditPricingConfig();
  const formatted = formatCredits(freeCredits);
  const refillText =
    refillHours === 1
      ? "recharge toutes les heures"
      : `recharge toutes les ${refillHours} h`;
  const pricingLabel = formatPricingSummary(pricing);
  const avgCost = Math.round((pricing.textBase + pricing.textBase + 3) / 2);
  const searchesLow = Math.max(1, Math.floor(freeCredits / (pricing.textBase + 3)));
  const searchesHigh = Math.max(searchesLow, Math.ceil(freeCredits / pricing.textBase));

  return {
    freeCredits,
    creditsPerAction,
    refillHours,
    freeCreditsLabel: `${formatted} crédits gratuits`,
    registrationLabel: `${formatted} crédits gratuits · ${refillText}`,
    refillLabel: `Recharge automatique toutes les ${refillHours} h`,
    costLabel: pricingLabel,
    pricing,
    pricingLabel,
    estimateSearchesLabel: `~${searchesLow}–${searchesHigh} recherches (${avgCost} cr. en moyenne)`,
  };
}

/** Emails autorisés à gérer les crédits (KLIR_ADMIN_EMAILS, séparés par virgule). */
export function getKlirAdminEmails(): string[] {
  return readEnv("KLIR_ADMIN_EMAILS")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isKlirAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = getKlirAdminEmails();
  if (!admins.length) return false;
  return admins.includes(email.trim().toLowerCase());
}

export function verifyKlirAdminSecret(headerValue: string | null): boolean {
  const secret = readEnv("KLIR_ADMIN_SECRET");
  if (!secret || !headerValue) return false;
  return headerValue === secret;
}

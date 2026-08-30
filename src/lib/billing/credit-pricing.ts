import { readEnv } from "@/lib/env";

export type CreditPricingConfig = {
  textBase: number;
  photoSearch: number;
  pdf: number;
  imageGen: number;
};

const DEFAULT_TEXT_BASE = 6;
const DEFAULT_PHOTO = 5;
const DEFAULT_PDF = 7;
const DEFAULT_IMAGE_GEN = 5;

function parsePositiveInt(raw: string, fallback: number): number {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getCreditPricingConfig(): CreditPricingConfig {
  return {
    textBase: parsePositiveInt(readEnv("CREDIT_TEXT_BASE"), DEFAULT_TEXT_BASE),
    photoSearch: parsePositiveInt(readEnv("CREDITS_PHOTO_SEARCH"), DEFAULT_PHOTO),
    pdf: parsePositiveInt(readEnv("CREDITS_PDF"), DEFAULT_PDF),
    imageGen: parsePositiveInt(readEnv("CREDITS_IMAGE_GEN"), DEFAULT_IMAGE_GEN),
  };
}

/** Coût texte selon la longueur du message — ~5–7 recherches avec 45 cr. gratuits. */
export function computeTextCredits(charCount: number, cfg?: CreditPricingConfig): number {
  const { textBase } = cfg ?? getCreditPricingConfig();
  const len = Math.max(0, charCount);
  if (len <= 120) return textBase;
  if (len <= 350) return textBase + 1;
  if (len <= 700) return textBase + 2;
  return textBase + 3;
}

export function detectPdfIntent(text: string): boolean {
  return /\b(pdf|document pdf|rapport pdf|brochure pdf|fiche pdf|export(?:er)?\s+(?:en\s+)?pdf|génère.*pdf|generer.*pdf|produce.*pdf)\b/i.test(
    text
  );
}

export function detectImageGenIntent(text: string): boolean {
  return /flyer|affichette|affiche promo|visuel promo|mockup|maquette produit|packshot|rendu produit|génère.*(?:photo|image|visuel)|generer.*(?:photo|image|visuel)|crée.*(?:photo|image|visuel)|cree.*(?:photo|image|visuel)/i.test(
    text
  );
}

export function detectMarketIntent(text: string): boolean {
  return /trading|trade\b|analyse.?march|btc|bitcoin|eth\b|ethereum|crypto|forex|eur\/usd|usd\/htg|aapl|tsla|action|bourse|pronostic|fear.?&.?greed/i.test(
    text
  );
}

export function detectSiteIntent(text: string): boolean {
  return /site web|landing|mini.?site|génère.*site|generer.*site|crée.*site|cree.*site|page web|héberge(r|ment)|\.sites\.klirline/i.test(
    text
  );
}

export function hasPhotoAttachment(contentTypes: string[]): boolean {
  return contentTypes.some((t) => t.startsWith("image/"));
}

export function hasPdfAttachment(contentTypes: string[]): boolean {
  return contentTypes.some((t) => t === "application/pdf");
}

export type ChatBillingInput = {
  message: string;
  attachmentContentTypes?: string[];
};

/** Estime le coût d'une recherche chat (texte, photo jointe, PDF, image, marché, site). */
export function computeChatCreditCost(
  input: ChatBillingInput,
  cfg?: CreditPricingConfig
): number {
  const pricing = cfg ?? getCreditPricingConfig();
  const message = input.message.trim();
  const types = input.attachmentContentTypes ?? [];

  let cost = computeTextCredits(message.length, pricing);

  if (hasPhotoAttachment(types)) {
    cost = Math.max(cost, pricing.photoSearch);
  }
  if (hasPdfAttachment(types) || detectPdfIntent(message)) {
    cost = Math.max(cost, pricing.pdf);
  }
  if (detectImageGenIntent(message)) {
    cost = Math.max(cost, pricing.imageGen);
  }
  if (detectMarketIntent(message)) {
    cost = Math.max(cost, computeTextCredits(message.length, pricing));
  }
  if (detectSiteIntent(message)) {
    cost = Math.max(cost, computeTextCredits(message.length, pricing) + 1);
  }

  return cost;
}

export function computeSiteCreditCost(brief: string, cfg?: CreditPricingConfig): number {
  const pricing = cfg ?? getCreditPricingConfig();
  return Math.max(computeTextCredits(brief.trim().length, pricing) + 1, pricing.textBase + 1);
}

export function formatPricingSummary(cfg?: CreditPricingConfig): string {
  const p = cfg ?? getCreditPricingConfig();
  const maxText = p.textBase + 3;
  return `${p.textBase}–${maxText} cr. texte · photo ${p.photoSearch} · PDF ${p.pdf} · image ${p.imageGen}`;
}

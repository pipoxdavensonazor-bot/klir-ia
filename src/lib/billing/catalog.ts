import { getPlan, type Plan, type PlanId } from "@/lib/billing/plans";

export type ProductType = "pass" | "hosting" | "domain";

export type HostingPlanId = "host30d";

export type HostingPlan = {
  id: HostingPlanId;
  productType: "hosting";
  name: string;
  tagline: string;
  htg: number;
  usd: number;
  durationMs: number;
  durationLabel: string;
  features: string[];
};

const D = 24 * 60 * 60 * 1000;

export const HOSTING_PLANS: HostingPlan[] = [
  {
    id: "host30d",
    productType: "hosting",
    name: "Hébergement Klirline",
    tagline: "Site en ligne 30 jours",
    htg: 500,
    usd: 4,
    durationMs: 30 * D,
    durationLabel: "30 jours",
    features: [
      "URL votre-nom.sites.klirline.io",
      "Sous-domaine votre-nom.sites.klirline.io",
      "SSL inclus",
      "Republier depuis le Studio",
    ],
  },
];

/** Prix retail annuel (wholesale + marge ~10 %). Pas besoin de compte OpenSRS pour démarrer. */
const TLD_PRICING: Record<string, { htg: number; usd: number; wholesaleUsd: number }> = {
  com: { htg: 1400, usd: 11, wholesaleUsd: 10 },
  net: { htg: 1400, usd: 11, wholesaleUsd: 10 },
  org: { htg: 1300, usd: 10, wholesaleUsd: 9 },
  ca: { htg: 1200, usd: 9, wholesaleUsd: 8 },
  io: { htg: 4200, usd: 32, wholesaleUsd: 29 },
  ht: { htg: 2800, usd: 22, wholesaleUsd: 20 },
};

export const PASS_DOMAIN_DISCOUNT_PCT = 10;

export function applyPassDomainDiscount(
  pricing: { htg: number; usd: number },
  hasPass: boolean
): { htg: number; usd: number } {
  if (!hasPass) return pricing;
  const factor = 1 - PASS_DOMAIN_DISCOUNT_PCT / 100;
  return {
    htg: Math.round(pricing.htg * factor),
    usd: Math.round(pricing.usd * factor * 100) / 100,
  };
}

export type DomainProduct = {
  id: string;
  productType: "domain";
  domain: string;
  tld: string;
  name: string;
  tagline: string;
  htg: number;
  usd: number;
  durationMs: number;
  durationLabel: string;
  features: string[];
};

export function getHostingPlan(id: string): HostingPlan | undefined {
  return HOSTING_PLANS.find((p) => p.id === id);
}

export function normalizeDomain(input: string): string | null {
  const raw = input.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  if (!raw || raw.length > 253) return null;
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(raw)) {
    return null;
  }
  return raw;
}

export function getDomainProduct(
  domainInput: string,
  opts?: { passDiscount?: boolean }
): DomainProduct | null {
  const domain = normalizeDomain(domainInput);
  if (!domain) return null;
  const parts = domain.split(".");
  const tld = parts[parts.length - 1];
  const base = TLD_PRICING[tld];
  if (!base) return null;
  const pricing = applyPassDomainDiscount(
    { htg: base.htg, usd: base.usd },
    Boolean(opts?.passDiscount)
  );
  return {
    id: `domain:${domain}`,
    productType: "domain",
    domain,
    tld,
    name: domain,
    tagline: `Enregistrement .${tld} — 1 an`,
    htg: pricing.htg,
    usd: pricing.usd,
    durationMs: 365 * D,
    durationLabel: "1 an",
    features: [
      "Enregistrement domaine 1 an (revendeur Klirline)",
      "DNS géré par Klirline",
      "Lien vers votre site *.sites.klirline.io",
      opts?.passDiscount ? `−${PASS_DOMAIN_DISCOUNT_PCT} % forfait actif` : "Paiement séparé du forfait Pro",
    ],
  };
}

export function detectProductType(planId: string): ProductType {
  if (planId.startsWith("domain:")) return "domain";
  if (planId.startsWith("host")) return "hosting";
  return "pass";
}

export type CheckoutProduct = Plan | HostingPlan | DomainProduct;

export function resolveCheckoutProduct(input: {
  productType?: ProductType;
  planId?: string;
  domain?: string;
}): CheckoutProduct | null {
  const type = input.productType ?? "pass";
  if (type === "hosting") {
    return getHostingPlan(input.planId ?? "host30d") ?? null;
  }
  if (type === "domain") {
    if (!input.domain) return null;
    return getDomainProduct(input.domain);
  }
  const plan = getPlan(input.planId ?? "");
  if (!plan || plan.id === "free") return null;
  return plan;
}

export function productAmount(product: CheckoutProduct): { htg: number; usd: number } {
  return { htg: product.htg, usd: product.usd };
}

export function productPlanId(product: CheckoutProduct): string {
  if ("domain" in product && product.productType === "domain") {
    return `domain:${product.domain}`;
  }
  return product.id;
}

export function listSupportedTlds(): string[] {
  return Object.keys(TLD_PRICING);
}

export function isPassPlanId(id: string): id is Exclude<PlanId, "free"> {
  return id === "pass24h" || id === "pass7d" || id === "pass30d";
}

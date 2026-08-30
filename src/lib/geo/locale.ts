/** Détection pays / devise / paiements selon la localisation (Cloudflare CF-IPCountry). */

export type GeoProfile = {
  country: string;
  locale: string;
  currency: string;
  timezone: string;
  label: string;
  paymentSuggestions: PaymentSuggestion[];
};

export type PaymentSuggestion = {
  id: "moncash" | "stripe" | "usdt" | "cash" | "paypal";
  label: string;
  hint: string;
  recommended: boolean;
};

const PROFILES: Record<string, Omit<GeoProfile, "country" | "paymentSuggestions">> = {
  HT: {
    locale: "fr-HT",
    currency: "HTG",
    timezone: "America/Port-au-Prince",
    label: "Haïti",
  },
  CA: {
    locale: "fr-CA",
    currency: "CAD",
    timezone: "America/Toronto",
    label: "Canada",
  },
  US: {
    locale: "en-US",
    currency: "USD",
    timezone: "America/New_York",
    label: "États-Unis",
  },
  FR: {
    locale: "fr-FR",
    currency: "EUR",
    timezone: "Europe/Paris",
    label: "France",
  },
  DO: {
    locale: "es-DO",
    currency: "DOP",
    timezone: "America/Santo_Domingo",
    label: "République dominicaine",
  },
};

const DEFAULT_PROFILE = {
  locale: "fr-CA",
  currency: "USD",
  timezone: "America/New_York",
  label: "International",
};

export function countryFromRequest(req: Request): string {
  const cf = req.headers.get("cf-ipcountry")?.toUpperCase();
  if (cf && cf.length === 2 && cf !== "XX" && cf !== "T1") return cf;
  const accept = req.headers.get("accept-language") ?? "";
  if (accept.includes("fr-CA") || accept.includes("fr-CA,")) return "CA";
  if (accept.includes("fr-HT") || accept.includes("ht")) return "HT";
  if (accept.includes("en-US")) return "US";
  if (accept.includes("fr-FR")) return "FR";
  return "HT";
}

function paymentSuggestionsForCountry(country: string): PaymentSuggestion[] {
  const all: PaymentSuggestion[] = [
    {
      id: "moncash",
      label: "MonCash",
      hint: "Paiement mobile populaire en Haïti — idéal pour ventes locales.",
      recommended: country === "HT",
    },
    {
      id: "stripe",
      label: "Stripe / Carte",
      hint: "Cartes Visa, Mastercard — recommandé pour e-commerce international.",
      recommended: country === "US" || country === "CA" || country === "FR",
    },
    {
      id: "usdt",
      label: "USDT (crypto)",
      hint: "Stablecoin TRC20 — utile pour paiements transfrontaliers.",
      recommended: false,
    },
    {
      id: "cash",
      label: "Espèces / sur place",
      hint: "Paiement à la livraison ou en boutique.",
      recommended: country === "HT",
    },
    {
      id: "paypal",
      label: "PayPal",
      hint: "Paiement en ligne international.",
      recommended: country === "US" || country === "CA",
    },
  ];
  return all.sort((a, b) => Number(b.recommended) - Number(a.recommended));
}

export function geoProfileForCountry(country: string): GeoProfile {
  const base = PROFILES[country] ?? DEFAULT_PROFILE;
  return {
    country,
    ...base,
    paymentSuggestions: paymentSuggestionsForCountry(country),
  };
}

export function geoProfileFromRequest(req: Request): GeoProfile {
  return geoProfileForCountry(countryFromRequest(req));
}

export type SitePaymentMethods = {
  moncash?: { enabled: boolean; phone?: string };
  stripe?: { enabled: boolean; publishableKey?: string };
  usdt?: { enabled: boolean; address?: string; network?: string };
  cash?: { enabled: boolean; instructions?: string };
  paypal?: { enabled: boolean; email?: string };
};

export function defaultPaymentMethods(country: string): SitePaymentMethods {
  const geo = geoProfileForCountry(country);
  const methods: SitePaymentMethods = {};
  for (const s of geo.paymentSuggestions) {
    if (s.recommended) {
      if (s.id === "moncash") methods.moncash = { enabled: true, phone: "" };
      if (s.id === "stripe") methods.stripe = { enabled: true, publishableKey: "" };
      if (s.id === "cash") methods.cash = { enabled: true, instructions: "Paiement sur place accepté." };
      if (s.id === "paypal") methods.paypal = { enabled: true, email: "" };
    }
  }
  return methods;
}

export function parsePaymentMethods(json: string | null | undefined): SitePaymentMethods {
  if (!json) return {};
  try {
    return JSON.parse(json) as SitePaymentMethods;
  } catch {
    return {};
  }
}

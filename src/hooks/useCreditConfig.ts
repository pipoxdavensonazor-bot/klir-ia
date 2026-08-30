"use client";

import { useEffect, useState } from "react";
import type { CreditPricingConfig } from "@/lib/billing/credit-pricing";

export type CreditConfigState = {
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

const FALLBACK_PRICING: CreditPricingConfig = {
  textBase: 6,
  photoSearch: 5,
  pdf: 7,
  imageGen: 5,
};

const FALLBACK: CreditConfigState = {
  freeCredits: 45,
  creditsPerAction: 6,
  refillHours: 5,
  freeCreditsLabel: "45 crédits gratuits",
  registrationLabel: "45 crédits gratuits · recharge toutes les 5 h",
  refillLabel: "Recharge automatique toutes les 5 h",
  costLabel: "6–9 cr. texte · photo 5 · PDF 7 · image 5",
  pricing: FALLBACK_PRICING,
  pricingLabel: "6–9 cr. texte · photo 5 · PDF 7 · image 5",
  estimateSearchesLabel: "~5–7 recherches",
};

let cached: CreditConfigState | null = null;

export function useCreditConfig(): CreditConfigState {
  const [config, setConfig] = useState<CreditConfigState>(cached ?? FALLBACK);

  useEffect(() => {
    if (cached) {
      setConfig(cached);
      return;
    }
    fetch("/api/public-config")
      .then((r) => r.json())
      .then((d) => {
        if (d?.credits) {
          cached = d.credits as CreditConfigState;
          setConfig(cached);
        }
      })
      .catch(() => undefined);
  }, []);

  return config;
}

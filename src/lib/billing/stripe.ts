import Stripe from "stripe";
import { readEnv } from "@/lib/env";

export function getStripe(): Stripe | null {
  const key = readEnv("STRIPE_SECRET_KEY");
  if (!key) return null;
  return new Stripe(key, {
    apiVersion: "2026-07-29.dahlia",
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function stripeConfigured(): boolean {
  return Boolean(readEnv("STRIPE_SECRET_KEY"));
}

import PricingPlans from "@/components/PricingPlans";
import SiteHeader from "@/components/SiteHeader";
import { getCreditPublicConfig } from "@/lib/billing/credit-config";

export const metadata = {
  title: "Forfaits — Klir IA",
  description: "Forfaits Klir IA : 250 / 500 / 2 500 HTG — 24h, 7j, 30j. Stripe, MonCash ou USDT.",
};

export default function PricingPage() {
  const credit = getCreditPublicConfig();

  return (
    <div className="site-shell min-h-screen flex flex-col">
      <SiteHeader active="pricing" />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-14">
        <div className="text-center mb-12">
          <p className="font-display text-4xl sm:text-5xl font-bold text-klir-primary tracking-tight">
            Forfaits
          </p>
          <p className="mt-3 text-klir-ink/65 max-w-xl mx-auto">
            {credit.registrationLabel}. Pass illimité : 250 HTG (24 h), 500 HTG (7 j), 2 500 HTG
            (30 j) — Stripe, MonCash ou USDT.
          </p>
          <p className="mt-2 text-sm">
            <a href="/developers" className="text-klir-primary underline hover:text-klir-dark">
              Intégrer Klir IA via API →
            </a>
          </p>
        </div>
        <PricingPlans />
      </main>

      <footer className="border-t border-klir-primary/10 py-8 text-center text-sm text-klir-ink/45">
        <p>
          Questions billing :{" "}
          <a href="mailto:contact@klirline.ca" className="underline hover:text-klir-primary">
            contact@klirline.ca
          </a>
        </p>
      </footer>
    </div>
  );
}

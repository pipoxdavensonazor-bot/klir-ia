"use client";

import { useKlirAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PASS_DOMAIN_DISCOUNT_PCT } from "@/lib/billing/catalog";

type Result = {
  domain: string;
  available: boolean;
  priceHtg: number | null;
  priceUsd: number | null;
  reason?: string;
};

type OwnedDomain = {
  id: string;
  domain: string;
  status: string;
  expires_at: number | null;
  created_at: number;
};

export default function DomainSearchPage() {
  const { isSignedIn, loading } = useKlirAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [owned, setOwned] = useState<OwnedDomain[]>([]);
  const [passDiscount, setPassDiscount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [buyBusy, setBuyBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      setOwned([]);
      setPassDiscount(0);
      return;
    }
    fetch("/api/domains")
      .then((r) => r.json())
      .then((d) => {
        setOwned(d.domains ?? []);
        setPassDiscount(d.passDomainDiscountPct ?? 0);
      })
      .catch(() => undefined);
  }, [isSignedIn]);

  async function search() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/domains/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function buy(domain: string) {
    if (!isSignedIn) {
      window.location.href = `/sign-up?redirect_url=${encodeURIComponent("/domains")}`;
      return;
    }
    setBuyBusy(domain);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType: "domain",
          domain,
          method: "moncash",
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/domains")}`;
        return;
      }
      if (!res.ok) throw new Error(data.error || "Échec");
      if (data.redirectUrl) window.location.href = data.redirectUrl;
      else if (data.usdt) {
        window.location.href = `/domains?order=${data.orderId}&domain=${encodeURIComponent(domain)}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBuyBusy(null);
    }
  }

  function displayPrice(r: Result): string {
    if (!r.priceHtg) return "";
    if (passDiscount > 0) {
      const discounted = Math.round(r.priceHtg * (1 - passDiscount / 100));
      return `${discounted.toLocaleString("fr-CA")} HTG / an (−${passDiscount} % forfait)`;
    }
    return `${r.priceHtg.toLocaleString("fr-CA")} HTG / an · ~${r.priceUsd} USD`;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <div className="rounded-xl border border-klir-accent/40 bg-klir-accent/10 p-4 space-y-2">
        <p className="text-sm font-semibold text-klir-primary">Option la moins chère</p>
        <p className="text-sm text-klir-ink/70 leading-relaxed">
          Publiez sans acheter de .com :{" "}
          <strong>500 HTG / 30 jours</strong> sur{" "}
          <code className="text-xs bg-white/80 px-1 rounded">mon-salon.sites.klirline.io</code>{" "}
          — pas de compte OpenSRS requis.
        </p>
        <a href="/studio/site" className="inline-block text-sm text-klir-primary underline font-medium">
          Générer et publier un site →
        </a>
      </div>

      <div>
        <h1 className="font-display text-2xl font-bold text-klir-primary">Domaines personnalisés</h1>
        <p className="text-sm text-klir-ink/60 mt-1 leading-relaxed">
          Optionnel — si vous voulez un vrai .com / .ht. Prix réduits · −{PASS_DOMAIN_DISCOUNT_PCT} % avec forfait actif.
        </p>
      </div>

      {isSignedIn && owned.length > 0 && (
        <section className="rounded-xl border border-klir-primary/15 bg-klir-primary/5 p-4 space-y-2">
          <h2 className="text-sm font-semibold text-klir-primary">Mes domaines</h2>
          <ul className="space-y-2">
            {owned.map((d) => (
              <li key={d.id} className="flex justify-between gap-2 text-sm">
                <span className="font-medium text-klir-primary">{d.domain}</span>
                <span className="text-xs text-klir-ink/50 capitalize">{d.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="mon-salon ou mon-salon.com"
          className="flex-1 rounded-xl border border-klir-primary/20 px-4 py-2.5 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim().length >= 2) void search();
          }}
        />
        <button
          type="button"
          disabled={busy || query.trim().length < 2}
          onClick={() => void search()}
          className="px-5 py-2.5 rounded-xl bg-klir-primary text-white text-sm font-medium disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Chercher"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
      )}

      <ul className="space-y-3">
        {results.map((r) => (
          <li
            key={r.domain}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-klir-primary/10 bg-white px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-klir-primary">{r.domain}</p>
              <p className="text-xs text-klir-ink/50">
                {r.available ? displayPrice(r) : r.reason}
              </p>
            </div>
            {r.available ? (
              <button
                type="button"
                disabled={loading || buyBusy === r.domain}
                onClick={() => void buy(r.domain)}
                className="text-sm px-4 py-2 rounded-lg bg-klir-accent text-klir-primary font-semibold disabled:opacity-50"
              >
                {buyBusy === r.domain ? "…" : "Acheter"}
              </button>
            ) : (
              <span className="text-xs text-klir-ink/40">Indisponible</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

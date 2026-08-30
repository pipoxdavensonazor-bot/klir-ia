"use client";

import { useKlirAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { PLANS, type PaymentMethod, type Plan, type PlanId } from "@/lib/billing/plans";
import { useCreditConfig } from "@/hooks/useCreditConfig";
import type { UsdtInvoice } from "@/lib/billing/usdt";

type MethodsAvailability = {
  stripe: boolean;
  moncash: boolean;
  usdt: boolean;
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  stripe: "Carte (Stripe)",
  moncash: "MonCash (HTG)",
  usdt: "USDT (Binance)",
};

export default function PricingPlans() {
  const credit = useCreditConfig();
  const { isSignedIn, loading } = useKlirAuth();
  const [methods, setMethods] = useState<MethodsAvailability>({
    stripe: false,
    moncash: false,
    usdt: false,
  });
  const [method, setMethod] = useState<PaymentMethod>("moncash");
  const [htgRate, setHtgRate] = useState(130);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{
    orderId: string;
    plan: Plan;
    usdt: UsdtInvoice;
  } | null>(null);
  const [txHash, setTxHash] = useState("");
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const anyMethodReady = methods.stripe || methods.moncash || methods.usdt;

  useEffect(() => {
    fetch("/api/checkout")
      .then((r) => r.json())
      .then((d) => {
        const next: MethodsAvailability = {
          stripe: Boolean(d.stripe),
          moncash: Boolean(d.moncash),
          usdt: Boolean(d.usdt),
        };
        setMethods(next);
        if (d.htgRate) setHtgRate(d.htgRate);
        const preferred: PaymentMethod[] = ["moncash", "stripe", "usdt"];
        const first = preferred.find((m) => next[m]);
        if (first) setMethod(first);
      })
      .catch(() => undefined);
  }, []);

  async function startCheckout(plan: Plan) {
    setError(null);
    setConfirmed(null);
    setCheckout(null);
    if (plan.id === "free") return;

    if (loading) return;
    if (!isSignedIn) {
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/pricing")}`;
      return;
    }

    if (!methods[method]) {
      setError(`${METHOD_LABEL[method]} n'est pas encore configuré.`);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, method }),
      });
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/pricing")}`;
        return;
      }
      if (!res.ok) throw new Error(data.error || "Échec");

      if (data.method === "stripe" && data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.method === "moncash" && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      if (data.method === "usdt" && data.usdt) {
        setCheckout({
          orderId: data.orderId,
          plan,
          usdt: data.usdt,
        });
        return;
      }
      throw new Error("Réponse checkout inattendue");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function submitTx() {
    if (!checkout || !txHash.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/usdt/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: checkout.orderId, txHash: txHash.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec");
      setConfirmed(data.message);
      setCheckout(null);
      setTxHash("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  function priceHint(plan: Plan) {
    if (plan.id === "free") return null;
    if (method === "stripe") {
      return `${plan.usd} $ USD · ${plan.durationLabel}`;
    }
    if (method === "moncash") {
      return `${plan.htg.toLocaleString("fr-HT")} HTG · ${plan.durationLabel}`;
    }
    return `≈ ${(plan.htg / htgRate).toFixed(2)} USDT · ${plan.durationLabel}`;
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap justify-center gap-2">
        {(["stripe", "moncash", "usdt"] as PaymentMethod[]).map((m) => (
          <button
            key={m}
            type="button"
            disabled={!methods[m]}
            onClick={() => setMethod(m)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition disabled:opacity-40 ${
              method === m
                ? "bg-klir-primary text-white border-klir-primary"
                : "border-klir-primary/20 text-klir-primary hover:bg-klir-primary/5"
            }`}
          >
            {METHOD_LABEL[m]}
          </button>
        ))}
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <article
            key={plan.id}
            className={`flex flex-col border-t-2 pt-6 ${
              plan.highlighted ? "border-klir-accent" : "border-klir-primary/20"
            }`}
          >
            <p className="font-display text-sm font-semibold tracking-wide text-klir-accent uppercase">
              {plan.name}
            </p>
            <p className="mt-1 text-sm text-klir-ink/55">{plan.tagline}</p>
            {plan.htg > 0 ? (
              <>
                <p className="mt-4 font-display text-3xl font-bold text-klir-primary">
                  {method === "stripe" ? (
                    <>
                      {plan.usd}
                      <span className="text-base font-medium text-klir-ink/45"> $</span>
                    </>
                  ) : (
                    <>
                      {plan.htg.toLocaleString("fr-HT")}
                      <span className="text-base font-medium text-klir-ink/45"> HTG</span>
                    </>
                  )}
                </p>
                <p className="mt-1 text-xs text-klir-ink/45">{priceHint(plan)}</p>
              </>
            ) : (
              <p className="mt-4 text-sm text-klir-ink/50">{plan.durationLabel}</p>
            )}
            <ul className="mt-5 space-y-2 text-sm text-klir-ink/70 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="leading-snug">
                  {f}
                </li>
              ))}
            </ul>

            {plan.id === "free" ? (
              <a
                href="/sign-up"
                className="mt-6 inline-flex justify-center px-4 py-2.5 rounded-xl border border-klir-primary/25 text-sm font-medium text-klir-primary hover:bg-klir-primary/5 transition"
              >
                Créer un compte
              </a>
            ) : (
              <button
                type="button"
                disabled={busy || !anyMethodReady || !methods[method]}
                onClick={() => startCheckout(plan)}
                className={`mt-6 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50 ${
                  plan.highlighted
                    ? "bg-klir-primary text-white hover:bg-klir-dark"
                    : "border border-klir-primary/25 text-klir-primary hover:bg-klir-primary/5"
                }`}
              >
                {busy ? "…" : `Payer · ${METHOD_LABEL[method]}`}
              </button>
            )}
          </article>
        ))}
      </div>

      <p className="text-center text-xs text-klir-ink/45 max-w-xl mx-auto">
        Paiement unique — accès illimité pendant la durée du forfait. Stripe (carte), MonCash
        (Haïti) ou USDT Binance.
      </p>
      <p className="text-center text-xs text-klir-ink/45 max-w-2xl mx-auto leading-relaxed">
        Le forfait débloque le chat illimité. Compte gratuit :{" "}
        <strong>{credit.freeCreditsLabel.toLowerCase()}</strong>, {credit.refillLabel.toLowerCase()} ({credit.costLabel}
        , {credit.estimateSearchesLabel}), ou forfait illimité.{" "}
        <a href="/domains" className="text-klir-primary underline">
          Domaines
        </a>{" "}
        et{" "}
        <a href="/studio/site" className="text-klir-primary underline">
          hébergement
        </a>{" "}
        (500 HTG / 30 j) se paient à part — −10 % domaines avec forfait actif.
      </p>

      {!anyMethodReady && (
        <p className="text-center text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          Paiements en configuration. Contact : contact@klirline.ca
        </p>
      )}

      {error && (
        <p className="text-center text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {confirmed && (
        <p className="text-center text-sm text-green-800 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          {confirmed}
        </p>
      )}

      {checkout && (
        <div className="max-w-lg mx-auto border border-klir-primary/15 rounded-2xl p-6 bg-white/80 space-y-4">
          <h3 className="font-display font-semibold text-klir-primary">
            Paiement USDT — {checkout.plan.name}
          </h3>
          <ol className="text-sm text-klir-ink/70 space-y-2 list-decimal list-inside">
            {checkout.usdt.instructions.map((line) => (
              <li key={line}>{line.replace(/\*\*/g, "")}</li>
            ))}
          </ol>
          <div>
            <p className="text-xs text-klir-ink/45 mb-1">Adresse Binance ({checkout.usdt.network})</p>
            <p className="font-mono text-xs break-all bg-klir-primary/5 p-3 rounded-lg select-all">
              {checkout.usdt.payAddress}
            </p>
          </div>
          <p className="text-sm">
            Montant : <strong>{checkout.usdt.payAmount} USDT</strong> ({checkout.usdt.htgAmount} HTG)
          </p>
          <p className="text-xs text-klir-ink/45">Réf. commande : {checkout.orderId}</p>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-klir-primary">
              Hash de transaction (après envoi)
            </span>
            <input
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="0x… ou ID Binance"
              className="w-full rounded-lg border border-klir-primary/20 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={busy || !txHash.trim()}
            onClick={submitTx}
            className="w-full px-4 py-2.5 rounded-xl bg-klir-primary text-white text-sm font-medium hover:bg-klir-dark disabled:opacity-50"
          >
            {busy ? "…" : "Confirmer le paiement"}
          </button>
        </div>
      )}
    </div>
  );
}

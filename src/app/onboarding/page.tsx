"use client";

import { useKlirAuth } from "@/components/AuthProvider";
import KlirLogo from "@/components/KlirLogo";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ROLES = [
  { id: "pme", label: "PME / entrepreneur" },
  { id: "creator", label: "Créateur / influenceur" },
  { id: "trader", label: "Trading / finance" },
  { id: "agency", label: "Agence / freelance" },
];

const GOALS = [
  { id: "marketing", label: "Marketing & contenu" },
  { id: "site", label: "Sites web & landing" },
  { id: "trading", label: "Analyse marché" },
  { id: "mix", label: "Un peu de tout" },
];

function OnboardingForm() {
  const { isSignedIn, loading } = useKlirAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState("");
  const [goal, setGoal] = useState("");
  const [sector, setSector] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!isSignedIn) {
      router.replace("/sign-in?redirect_url=/onboarding");
      return;
    }
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile?.onboardingDone) router.replace("/#chat");
        if (d.profile?.role) setRole(d.profile.role);
        if (d.profile?.goal) setGoal(d.profile.goal);
        if (d.profile?.sector) setSector(d.profile.sector);
      })
      .catch(() => undefined);
  }, [isSignedIn, loading, router]);

  async function finish() {
    if (!role || !goal) {
      setError("Choisissez un profil et un objectif.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          goal,
          sector: sector.trim() || undefined,
          onboardingDone: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      router.replace(goal === "site" ? "/studio/site" : "/#chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md w-full space-y-8">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <KlirLogo size={48} priority />
        </div>
        <h1 className="font-display text-2xl font-bold text-klir-primary">Bienvenue sur Klir IA</h1>
        <p className="text-sm text-klir-ink/60">30 secondes pour personnaliser votre expérience.</p>
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-klir-primary">Vous êtes…</p>
          <div className="grid gap-2">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRole(r.id);
                  setStep(1);
                }}
                className={`p-3 rounded-xl border text-sm text-left transition ${
                  role === r.id
                    ? "border-klir-primary bg-klir-primary/5"
                    : "border-klir-primary/15 hover:border-klir-primary/30"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-klir-primary">Objectif principal</p>
          <div className="grid gap-2">
            {GOALS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setGoal(g.id);
                  setStep(2);
                }}
                className={`p-3 rounded-xl border text-sm text-left transition ${
                  goal === g.id
                    ? "border-klir-primary bg-klir-primary/5"
                    : "border-klir-primary/15"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setStep(0)} className="text-xs text-klir-ink/45">
            ← Retour
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-klir-primary">Secteur (optionnel)</span>
            <input
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              placeholder="Ex. immobilier, restauration, crypto…"
              className="w-full rounded-xl border border-klir-primary/20 px-4 py-2.5 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void finish()}
            className="w-full py-3 rounded-xl bg-klir-primary text-white text-sm font-medium hover:bg-klir-dark disabled:opacity-50"
          >
            {busy ? "…" : "Commencer"}
          </button>
          <button type="button" onClick={() => setStep(1)} className="text-xs text-klir-ink/45">
            ← Retour
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const { loading } = useKlirAuth();

  return (
    <div className="site-shell min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {loading ? (
        <p className="text-sm text-klir-ink/50">Chargement…</p>
      ) : (
        <OnboardingForm />
      )}
    </div>
  );
}

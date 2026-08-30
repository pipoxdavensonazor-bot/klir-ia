"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import AuthMigrationNotice from "@/components/AuthMigrationNotice";
import KlirLogo from "@/components/KlirLogo";
import PasswordInput from "@/components/PasswordInput";
import { useKlirAuth } from "@/components/AuthProvider";

type Props = {
  mode: "login" | "register";
};

export default function AuthForm({ mode }: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const { refresh } = useKlirAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirect = search.get("redirect_url") || (mode === "register" ? "/onboarding" : "/#chat");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(
          mode === "register" ? { email, password, name: name || undefined } : { email, password }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur de connexion.");
        return;
      }
      await refresh();
      router.replace(data.redirect || redirect);
    } catch {
      setError("Réseau indisponible. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-klir-primary/15 bg-white p-6 sm:p-8 shadow-lg">
      <div className="flex flex-col items-center mb-6">
        <KlirLogo size={48} />
        <h1 className="mt-3 font-display text-xl font-bold text-klir-primary">
          {mode === "register" ? "Créer un compte" : "Connexion"}
        </h1>
        <p className="mt-1 text-sm text-klir-ink/60 text-center">
          Compte Klir IA — historique, crédits et forfaits
        </p>
      </div>

      {mode === "register" && <AuthMigrationNotice />}

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "register" && (
          <label className="block">
            <span className="text-xs font-semibold text-klir-ink/55">Prénom (optionnel)</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-klir-primary/20 px-3 py-2 text-sm"
              autoComplete="name"
            />
          </label>
        )}
        <label className="block">
          <span className="text-xs font-semibold text-klir-ink/55">Courriel</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-klir-primary/20 px-3 py-2 text-sm"
            autoComplete="email"
          />
        </label>
        {mode === "login" && (
          <p className="text-right text-xs -mb-2">
            <a href="/forgot-password" className="text-klir-primary hover:underline">
              Mot de passe oublié ?
            </a>
          </p>
        )}
        <PasswordInput
          label="Mot de passe"
          value={password}
          onChange={setPassword}
          required
          minLength={8}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-klir-primary text-white py-2.5 text-sm font-semibold hover:bg-klir-dark transition disabled:opacity-60"
        >
          {busy ? "…" : mode === "register" ? "S'inscrire" : "Se connecter"}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-klir-ink/50">
        {mode === "register" ? (
          <>
            Déjà un compte ?{" "}
            <a href="/sign-in" className="text-klir-primary font-medium hover:underline">
              Connexion
            </a>
          </>
        ) : (
          <>
            Pas encore de compte ?{" "}
            <a href="/sign-up" className="text-klir-primary font-medium hover:underline">
              Inscription
            </a>
          </>
        )}
      </p>
    </div>
  );
}

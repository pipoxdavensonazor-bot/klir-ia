"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import KlirLogo from "@/components/KlirLogo";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-klir-primary/15 bg-white p-6 sm:p-8 shadow-lg">
      <div className="flex flex-col items-center mb-6">
        <KlirLogo size={48} />
        <h1 className="mt-3 font-display text-xl font-bold text-klir-primary">Mot de passe oublié</h1>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-xs font-semibold text-klir-ink/55">Courriel</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-klir-primary/20 px-3 py-2 text-sm"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-klir-primary text-white py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {busy ? "…" : "Envoyer le lien"}
        </button>
      </form>
      <p className="mt-5 text-center text-xs text-klir-ink/50">
        <Link href="/sign-in" className="text-klir-primary font-medium hover:underline">
          Retour connexion
        </Link>
      </p>
    </div>
  );
}

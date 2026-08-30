"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, Suspense } from "react";
import Link from "next/link";
import KlirLogo from "@/components/KlirLogo";
import PasswordInput from "@/components/PasswordInput";

function ResetPasswordInner() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      router.replace("/sign-in?reset=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return <p className="text-sm text-red-600">Lien invalide. Demandez un nouveau lien.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PasswordInput
        label="Nouveau mot de passe"
        value={password}
        onChange={setPassword}
        required
        minLength={8}
        autoComplete="new-password"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-klir-primary text-white py-2.5 text-sm font-semibold disabled:opacity-60"
      >
        {busy ? "…" : "Enregistrer"}
      </button>
    </form>
  );
}

export default function ResetPasswordForm() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-klir-primary/15 bg-white p-6 sm:p-8 shadow-lg">
      <div className="flex flex-col items-center mb-6">
        <KlirLogo size={48} />
        <h1 className="mt-3 font-display text-xl font-bold text-klir-primary">Nouveau mot de passe</h1>
      </div>
      <Suspense fallback={<p className="text-sm text-klir-ink/50">Chargement…</p>}>
        <ResetPasswordInner />
      </Suspense>
      <p className="mt-5 text-center text-xs text-klir-ink/50">
        <Link href="/sign-in" className="text-klir-primary font-medium hover:underline">
          Connexion
        </Link>
      </p>
    </div>
  );
}

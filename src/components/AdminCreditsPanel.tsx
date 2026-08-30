"use client";

import { useState } from "react";

type Props = {
  adminEmail: string;
};

export default function AdminCreditsPanel({ adminEmail }: Props) {
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("100");
  const [action, setAction] = useState<"set" | "grant" | "deduct">("grant");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/credits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          action,
          amount: Number(amount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec");
      setMessage(
        `Solde de ${data.email} : ${data.balance.toLocaleString("fr-CA")} crédits (${data.action}).`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-klir-primary">Crédits — admin</h1>
        <p className="text-sm text-klir-ink/60 mt-1">
          Connecté en tant que {adminEmail}. Ajustez le solde d&apos;un compte utilisateur.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4 border border-klir-primary/15 rounded-2xl p-6 bg-white/80">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-klir-primary">Email utilisateur</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@exemple.com"
            className="w-full rounded-lg border border-klir-primary/20 px-3 py-2 text-sm"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-klir-primary">Action</span>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as "set" | "grant" | "deduct")}
            className="w-full rounded-lg border border-klir-primary/20 px-3 py-2 text-sm"
          >
            <option value="grant">Ajouter (grant)</option>
            <option value="deduct">Retirer (deduct)</option>
            <option value="set">Définir le solde (set)</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-medium text-klir-primary">Montant</span>
          <input
            type="number"
            min={0}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-klir-primary/20 px-3 py-2 text-sm"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full py-2.5 rounded-xl bg-klir-primary text-white text-sm font-medium hover:bg-klir-dark disabled:opacity-50"
        >
          {busy ? "…" : "Appliquer"}
        </button>
      </form>

      {message && (
        <p className="text-sm text-green-800 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <p className="text-xs text-klir-ink/45 leading-relaxed">
        Le montant gratuit se règle via{" "}
        <code className="text-[11px] bg-klir-primary/5 px-1 rounded">FREE_CREDITS</code> et{" "}
        <code className="text-[11px] bg-klir-primary/5 px-1 rounded">FREE_CREDITS_REFILL_HOURS</code>{" "}
        (Wrangler). Les admins sont listés dans{" "}
        <code className="text-[11px] bg-klir-primary/5 px-1 rounded">KLIR_ADMIN_EMAILS</code>.
      </p>
    </div>
  );
}

"use client";

import { useKlirAuth } from "@/components/AuthProvider";
import SiteHeader from "@/components/SiteHeader";
import { useEffect, useState } from "react";

type ApiKeyMeta = {
  id: string;
  name: string;
  prefix: string;
  createdAt: number;
};

export default function DevelopersPage() {
  const { isSignedIn, loading } = useKlirAuth();
  const [keys, setKeys] = useState<ApiKeyMeta[]>([]);
  const [passExpiresAt, setPassExpiresAt] = useState<number | null>(null);
  const [canCreate, setCanCreate] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadKeys() {
    if (loading || !isSignedIn) return;
    fetch("/api/keys")
      .then((r) => r.json())
      .then((d) => {
        setKeys(d.keys ?? []);
        setPassExpiresAt(d.passExpiresAt ?? null);
        setCanCreate(Boolean(d.canCreateKey));
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    loadKeys();
  }, [isSignedIn, loading]);

  async function createKey() {
    setBusy(true);
    setError(null);
    setNewSecret(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Intégration" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setNewSecret(data.key?.secret ?? null);
      loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm("Révoquer cette clé API ?")) return;
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    loadKeys();
  }

  return (
    <div className="site-shell min-h-screen flex flex-col">
      <SiteHeader active="developers" maxWidth="3xl" />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12 space-y-10">
        <div>
          <h1 className="font-display text-3xl font-bold text-klir-primary">API Klir IA</h1>
          <p className="mt-2 text-klir-ink/65">
            Intégrez l’assistant marketing dans votre app. Forfait actif requis (24h, 7j ou 30j).
          </p>
        </div>

        <section className="prose-klir text-sm space-y-4">
          <h2 className="font-display text-lg font-semibold text-klir-primary">Authentification</h2>
          <pre className="bg-klir-primary/5 p-4 rounded-xl text-xs overflow-x-auto">
            {`Authorization: Bearer klir_sk_live_VOTRE_CLE`}
          </pre>

          <h2 className="font-display text-lg font-semibold text-klir-primary">Chat</h2>
          <pre className="bg-klir-primary/5 p-4 rounded-xl text-xs overflow-x-auto">
            {`POST https://klirline.io/api/v1/chat
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "Écris un post LinkedIn sur…" }
  ],
  "skill": "social"
}`}
          </pre>

          <h2 className="font-display text-lg font-semibold text-klir-primary">Compte</h2>
          <pre className="bg-klir-primary/5 p-4 rounded-xl text-xs overflow-x-auto">
            {`GET https://klirline.io/api/v1/me`}
          </pre>
        </section>

        <section className="border border-klir-primary/15 rounded-2xl p-6 bg-white/80 space-y-4">
          <h2 className="font-display font-semibold text-klir-primary">Vos clés API</h2>
          {passExpiresAt ? (
            <p className="text-xs text-klir-ink/55">
              Forfait actif jusqu’au{" "}
              {new Date(passExpiresAt).toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          ) : (
            <p className="text-sm text-klir-ink/60">
              Aucun forfait actif.{" "}
              <a href="/pricing" className="text-klir-primary underline">
                Acheter un pass USDT
              </a>
            </p>
          )}

          {error && <p className="text-sm text-red-700">{error}</p>}

          {newSecret && (
            <div className="bg-klir-accent/15 border border-klir-accent/40 rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium text-klir-primary">Copiez cette clé maintenant :</p>
              <code className="block text-xs break-all select-all">{newSecret}</code>
            </div>
          )}

          <ul className="space-y-2">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between gap-3 text-sm border-b border-klir-primary/10 pb-2"
              >
                <span>
                  {k.name} · <code className="text-xs">{k.prefix}</code>
                </span>
                <button
                  type="button"
                  onClick={() => revoke(k.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Révoquer
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            disabled={!canCreate || busy || loading || !isSignedIn}
            onClick={createKey}
            className="px-4 py-2 rounded-xl bg-klir-primary text-white text-sm font-medium hover:bg-klir-dark disabled:opacity-50"
          >
            {busy ? "…" : "Créer une clé API"}
          </button>
        </section>
      </main>
    </div>
  );
}

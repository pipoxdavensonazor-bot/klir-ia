"use client";

import { useKlirAuth } from "@/components/AuthProvider";
import SiteHeader from "@/components/SiteHeader";
import { ExternalLink, LayoutDashboard, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type SiteItem = {
  slug: string;
  title: string;
  status: string;
  expiresAt: number;
  urls: { subdomain: string };
};

export default function SitesDashboardPage() {
  const { isSignedIn, loading } = useKlirAuth();
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!isSignedIn) {
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/dashboard/sites")}`;
      return;
    }
    void fetch("/api/sites")
      .then((r) => r.json())
      .then((d) => setSites(d.sites ?? []))
      .finally(() => setBusy(false));
  }, [isSignedIn, loading]);

  return (
    <>
      <SiteHeader active="studio" />
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-semibold text-klir-primary flex items-center gap-2">
              <LayoutDashboard className="w-7 h-7" /> Mes sites
            </h1>
            <p className="text-sm text-klir-ink/55 mt-1">
              Modifiez, ajoutez vos photos et configurez vos paiements — comme un vendeur Shopify.
            </p>
          </div>
          <Link
            href="/studio/site"
            className="px-4 py-2 rounded-xl bg-klir-accent text-klir-primary text-sm font-semibold hover:opacity-90"
          >
            Créer un site
          </Link>
        </div>

        {busy ? (
          <div className="flex items-center gap-2 text-klir-ink/50 py-12 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
          </div>
        ) : sites.length === 0 ? (
          <div className="rounded-xl border border-klir-primary/15 bg-white p-8 text-center space-y-3">
            <p className="text-klir-ink/60">Aucun site publié pour le moment.</p>
            <Link href="/studio/site" className="text-klir-primary underline text-sm">
              Lancer le wizard Klir IA →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {sites.map((s) => (
              <div
                key={s.slug}
                className="rounded-xl border border-klir-primary/15 bg-white p-5 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-klir-primary">{s.title}</p>
                  <a
                    href={s.urls.subdomain}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-klir-ink/50 inline-flex items-center gap-1 hover:text-klir-primary"
                  >
                    {s.urls.subdomain} <ExternalLink className="w-3 h-3" />
                  </a>
                  <p className="text-[10px] text-klir-ink/40 mt-1">
                    Expire le {new Date(s.expiresAt).toLocaleDateString("fr-CA")}
                  </p>
                </div>
                <Link
                  href={`/dashboard/sites/${s.slug}`}
                  className="px-4 py-2 rounded-lg bg-klir-primary text-white text-sm font-medium hover:bg-klir-dark"
                >
                  Admin / Éditer
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

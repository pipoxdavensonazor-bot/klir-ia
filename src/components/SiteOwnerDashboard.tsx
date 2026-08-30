"use client";

import { useKlirAuth } from "@/components/AuthProvider";
import SiteGuidePanel from "@/components/SiteGuidePanel";
import SitePreview from "@/components/SitePreview";
import {
  geoProfileForCountry,
  type GeoProfile,
  type SitePaymentMethods,
} from "@/lib/geo/locale";
import { injectHeroImage } from "@/lib/studio/site-html-enhance";
import {
  ExternalLink,
  ImagePlus,
  Loader2,
  Save,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type SiteData = {
  slug: string;
  title: string;
  urls: { subdomain: string };
};

type SettingsData = {
  businessName: string | null;
  businessCountry: string;
  businessCity: string | null;
  businessRegion: string | null;
  locale: string;
  currency: string;
  timezone: string;
  paymentMethods: SitePaymentMethods;
  assistantNotes: string | null;
};

type MediaItem = {
  id: string;
  filename: string;
  public_url: string;
  content_type: string;
};

type Props = { slug: string };

export default function SiteOwnerDashboard({ slug }: Props) {
  const { isSignedIn, loading } = useKlirAuth();
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"edit" | "photos" | "payments" | "business">("edit");
  const [site, setSite] = useState<SiteData | null>(null);
  const [html, setHtml] = useState("");
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [geo, setGeo] = useState<GeoProfile | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [siteRes, geoRes] = await Promise.all([
        fetch(`/api/sites/${slug}`),
        fetch("/api/geo/locale"),
      ]);
      const siteData = await siteRes.json();
      const geoData = await geoRes.json();
      if (!siteRes.ok) throw new Error(siteData.error || "Chargement échoué");
      setSite(siteData.site);
      setHtml(siteData.html ?? "");
      setSettings(siteData.settings);
      setGeo(geoData.geo ?? null);

      const mediaRes = await fetch(`/api/sites/${slug}/media`);
      const mediaData = await mediaRes.json();
      if (mediaRes.ok) setMedia(mediaData.media ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }, [slug]);

  useEffect(() => {
    if (loading) return;
    if (!isSignedIn) {
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent(`/dashboard/sites/${slug}`)}`;
      return;
    }
    void load();
  }, [isSignedIn, loading, load, slug]);

  async function saveAll() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/sites/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, settings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sauvegarde échouée");
      setSettings(data.settings);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/sites/${slug}/media`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload échoué");
      setMedia((m) => [data.media, ...m]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur upload");
    } finally {
      setUploading(false);
    }
  }

  function useAsHero(url: string) {
    const heroMatch = html.match(/<img[^>]+src="([^"]+)"/i);
    const oldSrc = heroMatch?.[1] ?? "";
    setHtml(injectHeroImage(html, oldSrc, url));
    setTab("edit");
  }

  function updatePayment(key: keyof SitePaymentMethods, patch: Record<string, unknown>) {
    if (!settings) return;
    setSettings({
      ...settings,
      paymentMethods: {
        ...settings.paymentMethods,
        [key]: { ...(settings.paymentMethods[key] as object), ...patch },
      },
    });
  }

  function applyCountry(country: string) {
    const profile = geoProfileForCountry(country);
    setSettings((s) =>
      s
        ? {
            ...s,
            businessCountry: country,
            locale: profile.locale,
            currency: profile.currency,
            timezone: profile.timezone,
          }
        : s
    );
  }

  if (busy) {
    return (
      <div className="flex items-center justify-center py-20 text-klir-ink/50 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Chargement de votre espace admin…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-klir-primary/60 font-semibold">
            Espace admin — Shopify-style
          </p>
          <h1 className="font-display text-2xl font-semibold text-klir-primary">{site?.title}</h1>
          {site?.urls.subdomain && (
            <a
              href={site.urls.subdomain}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-klir-primary/70 inline-flex items-center gap-1 mt-1 hover:underline"
            >
              {site.urls.subdomain} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveAll()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-klir-primary text-white text-sm font-medium hover:bg-klir-dark disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>

      {saved && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-2">
          Modifications enregistrées — site live mis à jour.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 border-b border-klir-primary/10 pb-2">
            {(
              [
                ["edit", "Éditeur", Sparkles],
                ["photos", "Mes photos", ImagePlus],
                ["payments", "Paiements", Settings2],
                ["business", "Entreprise", Settings2],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition ${
                  tab === id
                    ? "bg-klir-primary text-white"
                    : "text-klir-ink/60 hover:bg-klir-primary/5"
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          {tab === "edit" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-medium text-klir-ink/55">Code HTML du site</span>
                <textarea
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  rows={18}
                  className="w-full rounded-xl border border-klir-primary/20 px-3 py-2 text-xs font-mono bg-white"
                  spellCheck={false}
                />
              </label>
              <div>
                <p className="text-xs font-medium text-klir-ink/55 mb-2">Aperçu live</p>
                <SitePreview html={html} title={site?.title ?? slug} height={420} />
              </div>
            </div>
          )}

          {tab === "photos" && (
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-klir-primary/20 rounded-xl p-8 cursor-pointer hover:border-klir-primary/40 transition">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadPhoto(f);
                  }}
                />
                {uploading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-klir-primary" />
                ) : (
                  <ImagePlus className="w-8 h-8 text-klir-primary/50" />
                )}
                <span className="text-sm text-klir-ink/60">
                  {uploading ? "Envoi…" : "Ajouter vos photos (max 8 Mo)"}
                </span>
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                {media.map((m) => (
                  <div key={m.id} className="rounded-xl border border-klir-primary/10 overflow-hidden bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.public_url} alt={m.filename} className="w-full aspect-video object-cover" />
                    <div className="p-2 space-y-1">
                      <p className="text-[10px] text-klir-ink/50 truncate">{m.filename}</p>
                      <button
                        type="button"
                        onClick={() => useAsHero(m.public_url)}
                        className="w-full text-xs py-1.5 rounded-lg bg-klir-accent/30 text-klir-primary font-medium hover:bg-klir-accent/50"
                      >
                        Utiliser comme hero
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "payments" && settings && (
            <div className="space-y-4">
              {geo && (
                <p className="text-xs text-klir-ink/55 bg-klir-primary/5 rounded-xl px-4 py-3">
                  Suggestions pour <strong>{geo.label}</strong> — activez les méthodes que vos clients
                  utilisent vraiment.
                </p>
              )}
              <PaymentBlock
                title="MonCash"
                enabled={settings.paymentMethods.moncash?.enabled ?? false}
                onToggle={(v) => updatePayment("moncash", { enabled: v })}
              >
                <input
                  placeholder="Numéro MonCash (+509…)"
                  value={settings.paymentMethods.moncash?.phone ?? ""}
                  onChange={(e) => updatePayment("moncash", { phone: e.target.value })}
                  className="w-full rounded-lg border border-klir-primary/20 px-3 py-2 text-sm"
                />
              </PaymentBlock>
              <PaymentBlock
                title="Stripe / Carte"
                enabled={settings.paymentMethods.stripe?.enabled ?? false}
                onToggle={(v) => updatePayment("stripe", { enabled: v })}
              >
                <input
                  placeholder="Clé publique Stripe (pk_live_… ou pk_test_…)"
                  value={settings.paymentMethods.stripe?.publishableKey ?? ""}
                  onChange={(e) => updatePayment("stripe", { publishableKey: e.target.value })}
                  className="w-full rounded-lg border border-klir-primary/20 px-3 py-2 text-sm"
                />
              </PaymentBlock>
              <PaymentBlock
                title="USDT"
                enabled={settings.paymentMethods.usdt?.enabled ?? false}
                onToggle={(v) => updatePayment("usdt", { enabled: v })}
              >
                <input
                  placeholder="Adresse TRC20"
                  value={settings.paymentMethods.usdt?.address ?? ""}
                  onChange={(e) => updatePayment("usdt", { address: e.target.value, network: "TRC20" })}
                  className="w-full rounded-lg border border-klir-primary/20 px-3 py-2 text-sm"
                />
              </PaymentBlock>
              <PaymentBlock
                title="Espèces / sur place"
                enabled={settings.paymentMethods.cash?.enabled ?? false}
                onToggle={(v) => updatePayment("cash", { enabled: v })}
              >
                <input
                  placeholder="Instructions (ex. paiement à la livraison)"
                  value={settings.paymentMethods.cash?.instructions ?? ""}
                  onChange={(e) => updatePayment("cash", { instructions: e.target.value })}
                  className="w-full rounded-lg border border-klir-primary/20 px-3 py-2 text-sm"
                />
              </PaymentBlock>
            </div>
          )}

          {tab === "business" && settings && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nom entreprise">
                <input
                  value={settings.businessName ?? ""}
                  onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                  className="w-full rounded-lg border border-klir-primary/20 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Pays">
                <select
                  value={settings.businessCountry}
                  onChange={(e) => applyCountry(e.target.value)}
                  className="w-full rounded-lg border border-klir-primary/20 px-3 py-2 text-sm"
                >
                  {["HT", "CA", "US", "FR", "DO"].map((c) => (
                    <option key={c} value={c}>
                      {geoProfileForCountry(c).label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ville">
                <input
                  value={settings.businessCity ?? ""}
                  onChange={(e) => setSettings({ ...settings, businessCity: e.target.value })}
                  className="w-full rounded-lg border border-klir-primary/20 px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Devise">
                <input
                  value={settings.currency}
                  readOnly
                  className="w-full rounded-lg border border-klir-primary/10 px-3 py-2 text-sm bg-klir-primary/5"
                />
              </Field>
            </div>
          )}
        </div>

        <SiteGuidePanel context="dashboard" step={tab === "edit" ? 0 : tab === "photos" ? 1 : 2} />
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}
    </div>
  );
}

function PaymentBlock({
  title,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-klir-primary/15 p-4 space-y-3 bg-white">
      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <span className="font-medium text-klir-primary">{title}</span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="accent-klir-primary w-4 h-4"
        />
      </label>
      {enabled && children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-klir-ink/50">{label}</span>
      {children}
    </label>
  );
}

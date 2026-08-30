"use client";

import { useKlirAuth } from "@/components/AuthProvider";
import SiteGuidePanel from "@/components/SiteGuidePanel";
import { useEffect, useState } from "react";
import type { GeoProfile } from "@/lib/geo/locale";
import {
  defaultSiteWizardAnswers,
  buildSiteBrief,
  AUDIENCE_OPTIONS,
  CTA_PRESETS,
  LANGUAGE_OPTIONS,
  OBJECTIVE_OPTIONS,
  SECTION_OPTIONS,
  SECTOR_GROUPS,
  SITE_TYPE_OPTIONS,
  TONE_OPTIONS,
  suggestedCtaForObjective,
  validateWizardStep,
  WIZARD_STEPS,
  type SiteWizardAnswers,
} from "@/lib/studio/site-wizard";
import { geoProfileForCountry } from "@/lib/geo/locale";
import { SITE_TEMPLATES, getSiteTemplateMeta, isProTemplate } from "@/lib/studio/templates/catalog";
import { Loader2, ChevronLeft, ChevronRight, Sparkles, LayoutTemplate, Lock, Crown } from "lucide-react";
import SitePreview from "@/components/SitePreview";

type GeneratedSite = {
  html: string;
  title: string;
  mode?: string;
  templateId?: string;
  hosting?: { steps?: string[]; dashboardUrl?: string; wranglerHint?: string; summary?: string };
};

export default function SiteWizard() {
  const { isSignedIn, loading } = useKlirAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<SiteWizardAnswers>(defaultSiteWizardAnswers());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [site, setSite] = useState<GeneratedSite | null>(null);
  const [slug, setSlug] = useState("");
  const [publishBusy, setPublishBusy] = useState(false);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [templateFilter, setTemplateFilter] = useState<"all" | "free" | "pro">("all");
  const [geo, setGeo] = useState<GeoProfile | null>(null);

  useEffect(() => {
    void fetch("/api/geo/locale")
      .then((r) => r.json())
      .then((d) => {
        if (d.geo) {
          setGeo(d.geo);
          setAnswers((a) => ({ ...a, businessCountry: d.geo.country }));
        }
      })
      .catch(() => null);
  }, []);

  const totalSteps = WIZARD_STEPS.length;
  const onReview = step >= totalSteps;
  const selectedTemplate = getSiteTemplateMeta(answers.templateId);
  const isSelectedPro = isProTemplate(answers.templateId);
  const filteredTemplates =
    templateFilter === "all"
      ? SITE_TEMPLATES
      : SITE_TEMPLATES.filter((t) => t.tier === templateFilter);

  function patch(partial: Partial<SiteWizardAnswers>) {
    setAnswers((a) => ({ ...a, ...partial }));
  }

  function toggleSection(sectionId: string) {
    setAnswers((a) => {
      const has = a.sections.includes(sectionId);
      return {
        ...a,
        sections: has ? a.sections.filter((s) => s !== sectionId) : [...a.sections, sectionId],
      };
    });
  }

  function selectObjective(objectiveId: string) {
    const cta = suggestedCtaForObjective(objectiveId);
    setAnswers((a) => ({
      ...a,
      objective: objectiveId,
      ctaText: a.ctaText === "Demander un devis" || a.ctaText === "Commencer" ? cta.text : a.ctaText,
      ctaUrl: a.ctaUrl === "#contact" || a.ctaUrl === "https://" ? cta.url : a.ctaUrl,
    }));
  }

  function next() {
    const err = validateWizardStep(step, answers);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, totalSteps));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
    setSite(null);
  }

  async function generate(mode: "template" | "ai" = "template") {
    if (loading) return;
    if (!isSignedIn) {
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/studio/site")}`;
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/studio/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, mode, templateId: answers.templateId }),
      });
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/studio/site")}`;
        return;
      }
      if (!res.ok) {
        if (res.status === 402 && data.code === "PAYWALL") {
          throw new Error(
            data.error ||
              "Forfait ou crédits requis. Choisissez un template gratuit ou consultez /pricing."
          );
        }
        throw new Error(data.error || "Échec génération");
      }
      setSite(data.site);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function publishOnKlirline() {
    if (!site?.html) return;
    if (!isSignedIn) {
      window.location.href = `/sign-up?redirect_url=${encodeURIComponent("/studio/site")}`;
      return;
    }
    setPublishBusy(true);
    setError(null);
    try {
      const prep = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug || answers.brandName,
          title: site.title,
          html: site.html,
        }),
      });
      const prepData = await prep.json();
      if (!prep.ok) throw new Error(prepData.error || "Préparation échouée");

      const checkout = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType: "hosting",
          planId: "host30d",
          method: "moncash",
          draftId: prepData.draftId,
          siteSlug: prepData.slug,
          title: prepData.title,
          businessCountry: answers.businessCountry,
        }),
      });
      const checkoutData = await checkout.json();
      if (checkout.status === 401) {
        window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/studio/site")}`;
        return;
      }
      if (!checkout.ok) throw new Error(checkoutData.error || "Paiement impossible");
      if (checkoutData.redirectUrl) {
        window.location.href = checkoutData.redirectUrl;
        return;
      }
      setError("Choisissez MonCash ou configurez Stripe/USDT pour l'hébergement.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur publication");
    } finally {
      setPublishBusy(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {geo && !site && (
        <p className="text-xs text-klir-primary/70 bg-klir-primary/5 border border-klir-primary/10 rounded-xl px-4 py-3">
          Localisation détectée : <strong>{geo.label}</strong> — devise {geo.currency}, paiements
          suggérés : {geo.paymentSuggestions.filter((p) => p.recommended).map((p) => p.label).join(", ")}
        </p>
      )}

      {!onReview && !site && (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-klir-ink/45">
            <span>
              Étape {step + 1} / {totalSteps} — {WIZARD_STEPS[step].title}
            </span>
            <div className="flex gap-1">
              {WIZARD_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-6 rounded-full ${i <= step ? "bg-klir-primary" : "bg-klir-primary/15"}`}
                />
              ))}
            </div>
          </div>

          <h2 className="font-display text-xl font-semibold text-klir-primary">
            {WIZARD_STEPS[step].question}
          </h2>

          {step === 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: "all", label: "Tous" },
                    { id: "free", label: "Gratuits" },
                    { id: "pro", label: "Pro" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTemplateFilter(f.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                      templateFilter === f.id
                        ? "bg-klir-primary text-white border-klir-primary"
                        : "border-klir-primary/20 text-klir-ink/60 hover:border-klir-primary/40"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-klir-ink/50">
                8 templates gratuits · 10 templates Pro (skills design premium — forfait ou crédits)
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredTemplates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => patch({ templateId: tpl.id })}
                    className={`text-left p-4 rounded-xl border transition relative overflow-hidden ${
                      answers.templateId === tpl.id
                        ? "border-klir-primary ring-2 ring-klir-primary/20 bg-klir-primary/5"
                        : "border-klir-primary/15 hover:border-klir-primary/30"
                    }`}
                  >
                    <span
                      className={`absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        tpl.tier === "pro"
                          ? "bg-klir-primary text-white"
                          : "bg-klir-accent text-klir-primary"
                      }`}
                    >
                      {tpl.tier === "pro" ? (
                        <>
                          <Crown className="w-3 h-3" /> Pro
                        </>
                      ) : (
                        "Gratuit"
                      )}
                    </span>
                    <div
                      className="h-16 rounded-lg mb-3 border border-black/5"
                      style={{
                        background: `linear-gradient(135deg, ${tpl.preview.bg} 60%, ${tpl.preview.primary} 60%, ${tpl.preview.primary} 70%, ${tpl.preview.accent} 70%)`,
                      }}
                    />
                    <p className="font-medium text-klir-primary pr-16">{tpl.name}</p>
                    <p className="text-[10px] text-klir-primary/60 mt-0.5">{tpl.skillLabel}</p>
                    <p className="text-xs text-klir-ink/50 mt-1 leading-relaxed">{tpl.description}</p>
                    <p className="text-[10px] text-klir-ink/40 mt-2">{tpl.tags.join(" · ")}</p>
                  </button>
                ))}
              </div>
              {isSelectedPro && (
                <p className="text-xs text-klir-primary/70 bg-klir-primary/5 border border-klir-primary/15 rounded-xl px-4 py-3 inline-flex items-start gap-2">
                  <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>{selectedTemplate?.name}</strong> est un template Pro — forfait ou crédits
                    requis à la génération. Les 8 templates gratuits restent disponibles sans abonnement.
                  </span>
                </p>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {SITE_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => patch({ siteType: opt.id })}
                  className={`text-left p-4 rounded-xl border transition ${
                    answers.siteType === opt.id
                      ? "border-klir-primary ring-2 ring-klir-primary/20 bg-klir-primary/5"
                      : "border-klir-primary/15 hover:border-klir-primary/30"
                  }`}
                >
                  <p className="font-medium text-klir-primary">{opt.label}</p>
                  <p className="text-xs text-klir-accent font-medium mt-0.5">{opt.hint}</p>
                  <p className="text-xs text-klir-ink/55 mt-2 leading-relaxed">{opt.detail}</p>
                  <ul className="mt-2 space-y-0.5">
                    {opt.features.map((f) => (
                      <li key={f} className="text-[10px] text-klir-ink/45 flex items-start gap-1">
                        <span className="text-klir-primary">•</span> {f}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-klir-primary/50 mt-2 italic">Idéal : {opt.idealFor}</p>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-klir-ink/55">Nom de la marque ou entreprise *</span>
                <input
                  value={answers.brandName}
                  onChange={(e) => patch({ brandName: e.target.value })}
                  placeholder="Ex. Klirline, Studio Marie, Restaurant Lakay…"
                  className="w-full rounded-xl border border-klir-primary/20 px-4 py-3 text-sm"
                  autoFocus
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-klir-ink/55">Slogan ou accroche (optionnel)</span>
                <input
                  value={answers.tagline}
                  onChange={(e) => patch({ tagline: e.target.value })}
                  placeholder="Ex. Votre partenaire digital en Haïti depuis 2020"
                  className="w-full rounded-xl border border-klir-primary/20 px-4 py-3 text-sm"
                />
                <p className="text-[10px] text-klir-ink/40">
                  Apparaît sous le titre principal — une phrase claire sur votre valeur.
                </p>
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {SECTOR_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-klir-primary/70 mb-2">{group.label}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => patch({ sector: item.label })}
                        className={`text-left p-3 rounded-xl border text-sm transition ${
                          answers.sector === item.label
                            ? "border-klir-primary bg-klir-primary/5"
                            : "border-klir-primary/15 hover:border-klir-primary/30"
                        }`}
                      >
                        <p className="font-medium text-klir-primary">{item.label}</p>
                        <p className="text-[10px] text-klir-ink/45 mt-0.5">{item.example}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <label className="block space-y-1 pt-2 border-t border-klir-primary/10">
                <span className="text-xs font-medium text-klir-ink/55">Ou précisez votre niche</span>
                <input
                  value={answers.sector}
                  onChange={(e) => patch({ sector: e.target.value })}
                  placeholder="Ex. pâtisserie artisanale, coach fitness, agence immo…"
                  className="w-full rounded-xl border border-klir-primary/20 px-4 py-3 text-sm"
                />
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {AUDIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => patch({ audience: opt.id })}
                  className={`text-left p-4 rounded-xl border transition ${
                    answers.audience === opt.id
                      ? "border-klir-primary ring-2 ring-klir-primary/20 bg-klir-primary/5"
                      : "border-klir-primary/15 hover:border-klir-primary/30"
                  }`}
                >
                  <p className="font-medium text-klir-primary">{opt.label}</p>
                  <p className="text-xs text-klir-ink/55 mt-1">{opt.hint}</p>
                  <p className="text-[10px] text-klir-ink/40 mt-2">Ex. {opt.examples}</p>
                </button>
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {OBJECTIVE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => selectObjective(opt.id)}
                  className={`text-left p-4 rounded-xl border transition ${
                    answers.objective === opt.id
                      ? "border-klir-primary ring-2 ring-klir-primary/20 bg-klir-primary/5"
                      : "border-klir-primary/15 hover:border-klir-primary/30"
                  }`}
                >
                  <p className="font-medium text-klir-primary">{opt.label}</p>
                  <p className="text-xs text-klir-ink/55 mt-1 leading-relaxed">{opt.hint}</p>
                  <p className="text-[10px] text-klir-primary/60 mt-2">
                    KPI : {opt.kpi} · CTA suggéré : « {opt.ctaSuggestion} »
                  </p>
                </button>
              ))}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-3">
              <p className="text-xs text-klir-ink/50">
                Cochez les blocs à inclure — les sections marquées ★ sont recommandées pour la plupart des
                sites.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SECTION_OPTIONS.map((section) => (
                  <label
                    key={section.id}
                    className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer text-sm ${
                      answers.sections.includes(section.id)
                        ? "border-klir-primary bg-klir-primary/5"
                        : "border-klir-primary/15"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={answers.sections.includes(section.id)}
                      onChange={() => toggleSection(section.id)}
                      className="accent-klir-primary mt-0.5"
                    />
                    <span>
                      <span className="font-medium text-klir-primary">
                        {section.recommended ? "★ " : ""}
                        {section.label}
                      </span>
                      <span className="block text-[10px] text-klir-ink/45 mt-0.5 leading-relaxed">
                        {section.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {TONE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => patch({ tone: opt.id })}
                  className={`text-left p-4 rounded-xl border transition ${
                    answers.tone === opt.id
                      ? "border-klir-primary ring-2 ring-klir-primary/20 bg-klir-primary/5"
                      : "border-klir-primary/15 hover:border-klir-primary/30"
                  }`}
                >
                  <p className="font-medium text-klir-primary">{opt.label}</p>
                  <p className="text-xs text-klir-ink/55 mt-1">{opt.hint}</p>
                  <p className="text-[10px] text-klir-accent/80 mt-2 font-medium">{opt.mood}</p>
                </button>
              ))}
            </div>
          )}

          {step === 8 && (
            <div className="space-y-4">
              <p className="text-xs text-klir-ink/50">
                Ces infos alimentent votre admin et peuvent apparaître dans le footer du site.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-xs text-klir-ink/50">Ville</span>
                  <input
                    value={answers.businessCity}
                    onChange={(e) => patch({ businessCity: e.target.value })}
                    placeholder="Ex. Port-au-Prince, Montréal…"
                    className="w-full rounded-xl border border-klir-primary/20 px-4 py-2.5 text-sm"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-klir-ink/50">Pays</span>
                  <select
                    value={answers.businessCountry}
                    onChange={(e) => patch({ businessCountry: e.target.value })}
                    className="w-full rounded-xl border border-klir-primary/20 px-4 py-2.5 text-sm bg-white"
                  >
                    {["HT", "CA", "US", "FR", "DO"].map((c) => (
                      <option key={c} value={c}>
                        {geoProfileForCountry(c).label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-klir-ink/50">Email</span>
                  <input
                    type="email"
                    value={answers.contactEmail}
                    onChange={(e) => patch({ contactEmail: e.target.value })}
                    placeholder="contact@votremarque.com"
                    className="w-full rounded-xl border border-klir-primary/20 px-4 py-2.5 text-sm"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-klir-ink/50">Téléphone</span>
                  <input
                    value={answers.contactPhone}
                    onChange={(e) => patch({ contactPhone: e.target.value })}
                    placeholder="+509… ou +1…"
                    className="w-full rounded-xl border border-klir-primary/20 px-4 py-2.5 text-sm"
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-xs text-klir-ink/50">WhatsApp (numéro complet, sans +)</span>
                <input
                  value={answers.whatsapp}
                  onChange={(e) => patch({ whatsapp: e.target.value })}
                  placeholder="50912345678"
                  className="w-full rounded-xl border border-klir-primary/20 px-4 py-2.5 text-sm"
                />
              </label>
            </div>
          )}

          {step === 9 && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-klir-ink/55 mb-2">Presets rapides</p>
                <div className="flex flex-wrap gap-2">
                  {CTA_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        patch({
                          ctaText: preset.text,
                          ctaUrl:
                            preset.id === "whatsapp" && answers.whatsapp
                              ? `https://wa.me/${answers.whatsapp.replace(/\D/g, "")}`
                              : preset.url,
                        })
                      }
                      className="px-3 py-1.5 rounded-full text-xs border border-klir-primary/20 hover:bg-klir-primary/5 text-klir-primary"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block space-y-1">
                <span className="text-xs text-klir-ink/50">Texte du bouton *</span>
                <input
                  value={answers.ctaText}
                  onChange={(e) => patch({ ctaText: e.target.value })}
                  className="w-full rounded-xl border border-klir-primary/20 px-4 py-2.5 text-sm"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-klir-ink/50">Lien (URL ou ancre) *</span>
                <input
                  value={answers.ctaUrl}
                  onChange={(e) => patch({ ctaUrl: e.target.value })}
                  placeholder="#contact, https://…, tel:+509…"
                  className="w-full rounded-xl border border-klir-primary/20 px-4 py-2.5 text-sm"
                />
              </label>
            </div>
          )}

          {step === 10 && (
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-klir-ink/55">Langue du site</span>
                <select
                  value={answers.language}
                  onChange={(e) => patch({ language: e.target.value })}
                  className="w-full rounded-xl border border-klir-primary/20 px-4 py-2.5 text-sm bg-white"
                >
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.label} — {lang.hint}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-4">
                <label className="flex-1 space-y-1">
                  <span className="text-xs text-klir-ink/50">Couleur primaire</span>
                  <input
                    type="color"
                    value={answers.primaryColor}
                    onChange={(e) => patch({ primaryColor: e.target.value })}
                    className="w-full h-10 rounded-lg border border-klir-primary/20"
                  />
                </label>
                <label className="flex-1 space-y-1">
                  <span className="text-xs text-klir-ink/50">Accent</span>
                  <input
                    type="color"
                    value={answers.accentColor}
                    onChange={(e) => patch({ accentColor: e.target.value })}
                    className="w-full h-10 rounded-lg border border-klir-primary/20"
                  />
                </label>
              </div>
              <textarea
                value={answers.extraNotes}
                onChange={(e) => patch({ extraNotes: e.target.value })}
                placeholder="Notes pour Klir IA : concurrents à éviter, promotions en cours, mentions légales, mots-clés SEO…"
                rows={4}
                className="w-full rounded-xl border border-klir-primary/20 px-4 py-2.5 text-sm"
              />
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="inline-flex items-center gap-1 text-sm text-klir-ink/55 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Retour
            </button>
            <button
              type="button"
              onClick={step === totalSteps - 1 ? () => next() : next}
              className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl bg-klir-primary text-white text-sm font-medium hover:bg-klir-dark"
            >
              {step === totalSteps - 1 ? "Récapitulatif" : "Suivant"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          </div>
          <SiteGuidePanel step={step} />
        </div>
      )}

      {onReview && !site && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-klir-primary">Récapitulatif</h2>
          <pre className="text-sm text-klir-ink/70 whitespace-pre-wrap bg-white/80 border border-klir-primary/10 rounded-xl p-4">
            {buildSiteBrief(answers)}
          </pre>
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={back} className="text-sm text-klir-ink/55 sm:self-center">
              Modifier
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void generate("template")}
              className="flex-1 px-5 py-2.5 rounded-xl bg-klir-accent text-klir-primary text-sm font-semibold hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : isSelectedPro ? <Crown className="w-4 h-4" /> : <LayoutTemplate className="w-4 h-4" />}
              {busy
                ? "Génération…"
                : isSelectedPro
                  ? "Appliquer le template Pro"
                  : "Appliquer le template (gratuit)"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void generate("ai")}
              className="flex-1 px-5 py-2.5 rounded-xl bg-klir-primary text-white text-sm font-medium hover:bg-klir-dark disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {busy ? "Génération…" : "Personnaliser avec IA"}
            </button>
          </div>
          <p className="text-xs text-klir-ink/45">
            Templates gratuits = instantanés, sans crédits. Templates Pro et IA = forfait ou crédits
            (sections premium, stats, témoignages).
          </p>
        </div>
      )}

      {site && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-display text-xl font-semibold text-klir-primary truncate">
              {site.title}
            </h2>
            {site.mode === "template" && (
              <span
                className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full inline-flex items-center gap-1 ${
                  isProTemplate(site.templateId ?? answers.templateId)
                    ? "bg-klir-primary text-white"
                    : "bg-klir-accent/20 text-klir-primary"
                }`}
              >
                {isProTemplate(site.templateId ?? answers.templateId) ? (
                  <>
                    <Crown className="w-3 h-3" /> Template Pro
                  </>
                ) : (
                  "Template gratuit"
                )}
              </span>
            )}
          </div>
          <SitePreview html={site.html} title={site.title} height={560} />
          <div className="rounded-xl border border-klir-accent/30 bg-klir-accent/10 p-4 text-sm text-klir-primary space-y-2">
            <p className="font-semibold">Après publication — votre espace admin</p>
            <p className="text-klir-ink/65 text-xs leading-relaxed">
              Un compte admin est créé automatiquement : modifiez le site, ajoutez vos photos,
              configurez MonCash/Stripe et partagez votre lien — comme un vendeur Shopify.
            </p>
            <a href="/dashboard/sites" className="inline-block text-xs font-medium underline">
              Voir mes sites →
            </a>
          </div>
          {site.hosting?.summary && (
            <p className="text-xs text-klir-ink/50">{site.hosting.summary}</p>
          )}
          <div className="rounded-xl border border-klir-primary/15 bg-klir-primary/5 p-4 space-y-3">
            <p className="text-sm font-semibold text-klir-primary">Publier sur Klirline — 500 HTG / 30 jours</p>
            <label className="block text-xs text-klir-ink/55">
              Nom d&apos;URL (ex. mon-salon)
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={answers.brandName || "mon-salon"}
                className="mt-1 w-full rounded-lg border border-klir-primary/20 px-3 py-2 text-sm bg-white"
              />
            </label>
            <button
              type="button"
              disabled={publishBusy}
              onClick={() => void publishOnKlirline()}
              className="w-full px-4 py-2.5 rounded-lg bg-klir-accent text-klir-primary text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {publishBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Publier et payer
            </button>
            {liveUrl && (
              <a href={liveUrl} className="text-xs text-klir-primary underline break-all">
                {liveUrl}
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setSite(null);
              setStep(0);
              setAnswers(defaultSiteWizardAnswers());
            }}
            className="text-sm text-klir-primary underline"
          >
            Créer un autre site
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

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Download,
  Eraser,
  Expand,
  FileUp,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Check,
} from "lucide-react";
import {
  DEFAULT_SVG_TEMPLATE,
  downloadTextFile,
  parseSvgDimensions,
  sanitizeSvgForPreview,
  svgToJpegBlob,
  svgToPngBlob,
  validateSvgMarkup,
} from "@/lib/studio/svg-studio";
import { useCreditConfig } from "@/hooks/useCreditConfig";

const STORAGE_KEY = "klir_svg_studio_code";
const ZOOM_LEVELS = [50, 75, 100, 125, 150] as const;
const BG_PRESETS = [
  { id: "dark", label: "Sombre", className: "bg-[#0B1220]" },
  { id: "light", label: "Clair", className: "bg-slate-200" },
  { id: "check", label: "Damier", className: "bg-[length:16px_16px] bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%),linear-gradient(-45deg,#1e293b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e293b_75%),linear-gradient(-45deg,transparent_75%,#1e293b_75%)] bg-[position:0_0,0_8px,8px_-8px,-8px_0]" },
] as const;

export default function SvgVisualStudio() {
  const credit = useCreditConfig();
  const [code, setCode] = useState(DEFAULT_SVG_TEMPLATE);
  const [preview, setPreview] = useState(DEFAULT_SVG_TEMPLATE);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState<"svg" | "png" | "jpeg" | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [bgId, setBgId] = useState<(typeof BG_PRESETS)[number]["id"]>("dark");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState(
    "Ajoute une zone de résistance rouge à 79 200 et une zone de support verte à 77 800"
  );
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dimensions = useMemo(() => parseSvgDimensions(code), [code]);
  const bgPreset = BG_PRESETS.find((b) => b.id === bgId) ?? BG_PRESETS[0];

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved?.trim()) {
        setCode(saved);
        setPreview(sanitizeSvgForPreview(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const refreshPreview = useCallback((source: string) => {
    const validation = validateSvgMarkup(source);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    setError(null);
    setPreview(sanitizeSvgForPreview(source));
    try {
      localStorage.setItem(STORAGE_KEY, source);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => refreshPreview(code), 180);
    return () => window.clearTimeout(t);
  }, [code, refreshPreview]);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Copie impossible dans ce navigateur.");
    }
  }

  function clearCode() {
    setCode(DEFAULT_SVG_TEMPLATE);
  }

  function onImportFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCode(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function exportSvg() {
    const validation = validateSvgMarkup(code);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    downloadTextFile(code.trim(), "klir-trading-chart.svg", "image/svg+xml;charset=utf-8");
  }

  async function exportRaster(format: "png" | "jpeg") {
    const validation = validateSvgMarkup(code);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    setExporting(format);
    setError(null);
    try {
      const blob =
        format === "png" ? await svgToPngBlob(code, 2) : await svgToJpegBlob(code, 2);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `klir-trading-chart.${format === "png" ? "png" : "jpg"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Export ${format.toUpperCase()} échoué.`);
    } finally {
      setExporting(null);
    }
  }

  async function exportPng() {
    await exportRaster("png");
  }

  async function exportJpeg() {
    await exportRaster("jpeg");
  }

  async function toggleFullscreen() {
    if (!rootRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await rootRef.current.requestFullscreen();
  }

  async function applyAi() {
    const prompt = aiPrompt.trim();
    if (!prompt || aiBusy) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch("/api/studio/svg/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, svg: code }),
      });
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/studio/svg")}`;
        return;
      }
      if (res.status === 402) {
        setAiError(typeof data.error === "string" ? data.error : "Crédits épuisés — voir /pricing");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Erreur IA");
      if (typeof data.svg === "string") setCode(data.svg);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Erreur IA");
    } finally {
      setAiBusy(false);
    }
  }

  const btn =
    "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 transition disabled:opacity-40";

  return (
    <div
      ref={rootRef}
      className={`flex flex-col gap-3 ${fullscreen ? "h-screen bg-[#0d1117] p-3" : "min-h-[calc(100dvh-8rem)]"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
            SVG Visual Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Graphiques trading exportables — posts LinkedIn / Facebook
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <input
            ref={fileRef}
            type="file"
            accept=".svg,.xml,image/svg+xml,text/xml"
            className="hidden"
            onChange={(e) => onImportFile(e.target.files?.[0] ?? null)}
          />
          <button type="button" className={btn} onClick={() => fileRef.current?.click()}>
            <FileUp className="w-3.5 h-3.5" /> Importer
          </button>
          <button type="button" className={btn} onClick={() => void copyCode()}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copié" : "Copier"}
          </button>
          <button type="button" className={btn} onClick={clearCode}>
            <Eraser className="w-3.5 h-3.5" /> Effacer
          </button>
          <button type="button" className={btn} onClick={exportSvg}>
            <Download className="w-3.5 h-3.5" /> Export SVG
          </button>
          <button type="button" className={btn} disabled={exporting === "png"} onClick={() => void exportPng()}>
            {exporting === "png" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5" />
            )}
            Export PNG
          </button>
          <button type="button" className={btn} disabled={exporting === "jpeg"} onClick={() => void exportJpeg()}>
            {exporting === "jpeg" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5" />
            )}
            Export JPEG
          </button>
          <button type="button" className={btn} onClick={() => void toggleFullscreen()}>
            <Expand className="w-3.5 h-3.5" /> Plein écran
          </button>
          <button
            type="button"
            className={`${btn} border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10`}
            onClick={() => setAiOpen((v) => !v)}
          >
            <Sparkles className="w-3.5 h-3.5" /> Klir IA
          </button>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-[480px] lg:min-h-[560px] rounded-xl border border-slate-700/80 overflow-hidden bg-[#0d1117] shadow-2xl">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-700/80 bg-[#161b22] text-[11px] uppercase tracking-wider font-semibold text-slate-400">
          <span>SVG Visual Studio</span>
          <span className="hidden sm:inline text-slate-500">Preview · Export</span>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-700/80">
          <section className="flex flex-col flex-1 min-h-[220px] lg:min-h-0">
            <div className="px-3 py-1.5 border-b border-slate-700/60 text-[10px] uppercase tracking-widest text-slate-500 font-bold bg-[#010409]">
              Code
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full resize-none bg-[#010409] text-emerald-300/90 font-mono text-[11px] sm:text-xs leading-relaxed p-3 focus:outline-none min-h-[200px]"
              aria-label="Code SVG"
            />
          </section>

          <section className="flex flex-col flex-1 min-h-[240px] lg:min-h-0">
            <div className="px-3 py-1.5 border-b border-slate-700/60 text-[10px] uppercase tracking-widest text-slate-500 font-bold bg-[#161b22]">
              Live preview
            </div>
            <div
              className={`flex-1 overflow-auto p-4 flex items-center justify-center min-h-[220px] ${bgPreset.className}`}
            >
              {!error ? (
                <div
                  style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center center" }}
                  className="transition-transform duration-150 [&>svg]:rounded-lg [&>svg]:shadow-2xl [&>svg]:max-w-none"
                  dangerouslySetInnerHTML={{ __html: preview }}
                />
              ) : (
                <p className="text-sm text-slate-400 text-center px-4 max-w-xs">
                  Corrigez le XML/SVG pour afficher l&apos;aperçu live.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 border-t border-slate-700/80 bg-[#161b22] text-[11px] text-slate-400">
          <span className={error ? "text-red-400" : "text-emerald-400"}>
            {error ? "SVG invalide" : "SVG Valid ✓"}
          </span>
          <span>
            {dimensions.width} × {dimensions.height}
          </span>
          <label className="inline-flex items-center gap-1.5">
            Zoom
            <select
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="rounded border border-slate-600 bg-[#0d1117] text-slate-200 px-1.5 py-0.5 text-[11px]"
            >
              {ZOOM_LEVELS.map((z) => (
                <option key={z} value={z}>
                  {z}%
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-1.5">
            Background
            <select
              value={bgId}
              onChange={(e) => setBgId(e.target.value as typeof bgId)}
              className="rounded border border-slate-600 bg-[#0d1117] text-slate-200 px-1.5 py-0.5 text-[11px]"
            >
              {BG_PRESETS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <span className="hidden sm:inline text-slate-600">·</span>
          <button
            type="button"
            disabled={Boolean(error) || exporting != null}
            onClick={() => void exportPng()}
            className="inline-flex items-center gap-1 text-emerald-400/90 hover:text-emerald-300 disabled:opacity-40"
          >
            <Download className="w-3 h-3" /> PNG
          </button>
          <button
            type="button"
            disabled={Boolean(error) || exporting != null}
            onClick={() => void exportJpeg()}
            className="inline-flex items-center gap-1 text-emerald-400/90 hover:text-emerald-300 disabled:opacity-40"
          >
            <Download className="w-3 h-3" /> JPEG
          </button>
          {error ? <span className="text-red-300 truncate max-w-full">{error}</span> : null}
        </div>
      </div>

      {aiOpen && (
        <section className="rounded-xl border border-[#D4AF37]/25 bg-[#161b22] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#D4AF37]">Klir IA — style TradingView</p>
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">
              {credit.pricingLabel}
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Exemple : zones support/résistance, prix BTC/USD, variation % — prêt pour export réseaux
            sociaux.
          </p>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-white/10 bg-[#0d1117] text-slate-100 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
            placeholder="Décrivez la modification SVG…"
          />
          {aiError ? (
            <p className="text-xs text-red-300">
              {aiError}{" "}
              <a href="/pricing" className="underline text-[#D4AF37]">
                Forfaits
              </a>
            </p>
          ) : null}
          <button
            type="button"
            disabled={aiBusy || !aiPrompt.trim()}
            onClick={() => void applyAi()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#004F6E] text-white text-sm font-medium hover:bg-[#003548] disabled:opacity-50"
          >
            {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Appliquer avec Klir IA
          </button>
        </section>
      )}
    </div>
  );
}

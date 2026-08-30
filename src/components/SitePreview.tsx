"use client";

import { useMemo, useState } from "react";
import { Download, ExternalLink, Copy, Check, Monitor, Smartphone } from "lucide-react";

type ViewMode = "desktop" | "mobile";

type SitePreviewProps = {
  html: string;
  title?: string;
  height?: number;
  compact?: boolean;
  showToolbar?: boolean;
};

function preparePreviewHtml(html: string): string {
  if (!html?.trim()) {
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><title>Aperçu</title></head><body style="font-family:system-ui;padding:2rem;color:#64748b"><p>Contenu du site indisponible. Régénérez le site.</p></body></html>`;
  }

  let doc = html;
  if (!doc.includes('<meta name="viewport"')) {
    doc = doc.replace(
      /<head([^>]*)>/i,
      '<head$1><meta name="viewport" content="width=device-width,initial-scale=1"/>'
    );
  }

  if (!doc.includes("fonts.googleapis.com")) {
    return doc;
  }

  const fontFix = `<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>`;
  if (/<head[^>]*>/i.test(doc)) {
    return doc.replace(/<head([^>]*)>/i, `<head$1>${fontFix}`);
  }
  return doc;
}

export default function SitePreview({
  html,
  title = "Aperçu site",
  height = 520,
  compact = false,
  showToolbar = true,
}: SitePreviewProps) {
  const [view, setView] = useState<ViewMode>("desktop");
  const [copied, setCopied] = useState(false);

  const frameHeight = compact ? Math.min(height, 480) : height;
  const frameWidth = view === "mobile" ? "min(100%, 390px)" : "100%";

  const srcDoc = useMemo(() => preparePreviewHtml(html), [html]);

  function openFullscreen() {
    const popup = window.open("", "_blank", "noopener,noreferrer,width=1280,height=900");
    if (!popup) {
      alert("Autorisez les pop-ups pour ouvrir l'aperçu plein écran.");
      return;
    }
    popup.document.open();
    popup.document.write(srcDoc);
    popup.document.close();
    popup.document.title = title || "Aperçu site Klir IA";
  }

  function downloadHtml() {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "site-klir-ia").replace(/[^\w\-]+/g, "-").slice(0, 40)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyHtml() {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (!html?.trim()) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
        Aperçu indisponible — le HTML du site est vide. Relancez la génération.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-klir-primary/15 bg-gradient-to-b from-slate-50 to-white overflow-hidden shadow-sm">
      {showToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-klir-primary/10 bg-white/90">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setView("desktop")}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition ${
                view === "desktop"
                  ? "bg-klir-primary text-white"
                  : "text-klir-ink/60 hover:bg-klir-primary/5"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" /> Bureau
            </button>
            <button
              type="button"
              onClick={() => setView("mobile")}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition ${
                view === "mobile"
                  ? "bg-klir-primary text-white"
                  : "text-klir-ink/60 hover:bg-klir-primary/5"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Mobile
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => void copyHtml()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-klir-primary border border-klir-primary/15 hover:bg-klir-primary/5"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copié" : "HTML"}
            </button>
            <button
              type="button"
              onClick={downloadHtml}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-klir-primary border border-klir-primary/15 hover:bg-klir-primary/5"
            >
              <Download className="w-3.5 h-3.5" /> Télécharger
            </button>
            <button
              type="button"
              onClick={openFullscreen}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-klir-accent text-klir-primary hover:opacity-90"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Plein écran
            </button>
          </div>
        </div>
      )}

      <div
        className={`flex justify-center bg-[#e8ecf1] ${view === "mobile" ? "py-4 px-3" : "p-0"}`}
        style={{ minHeight: frameHeight + (view === "mobile" ? 32 : 0) }}
      >
        <iframe
          title={title}
          srcDoc={srcDoc}
          className={`bg-white transition-all duration-200 ${
            view === "mobile" ? "rounded-[1.25rem] shadow-lg border border-black/10" : "rounded-none"
          }`}
          style={{ width: frameWidth, height: frameHeight, border: "none" }}
          sandbox="allow-same-origin allow-scripts allow-popups"
        />
      </div>
    </div>
  );
}

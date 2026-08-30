/** Utilitaires SVG Visual Studio — validation, export, template par défaut. */

export const DEFAULT_SVG_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 320" width="680" height="320">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#0B1220"/>
    </linearGradient>
    <linearGradient id="areaUp" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#22C55E" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#22C55E" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="680" height="320" fill="url(#bg)" rx="12"/>
  <text x="20" y="28" fill="#94A3B8" font-family="system-ui,sans-serif" font-size="12" font-weight="600">BTC / USD</text>
  <text x="20" y="58" fill="#F8FAFC" font-family="system-ui,sans-serif" font-size="26" font-weight="700">78 641,68 $</text>
  <text x="20" y="78" fill="#22C55E" font-family="system-ui,sans-serif" font-size="11">+2,34 % · 24h</text>
  <line x1="16" y1="248" x2="664" y2="248" stroke="#1E293B" stroke-width="1"/>
  <line x1="16" y1="198" x2="664" y2="198" stroke="#1E293B" stroke-width="1"/>
  <line x1="16" y1="148" x2="664" y2="148" stroke="#1E293B" stroke-width="1"/>
  <line x1="16" y1="98" x2="664" y2="98" stroke="#1E293B" stroke-width="1"/>
  <rect x="16" y="92" width="648" height="36" fill="#EF4444" fill-opacity="0.1" stroke="#EF4444" stroke-opacity="0.35"/>
  <text x="24" y="114" fill="#FCA5A5" font-family="system-ui,sans-serif" font-size="10">Résistance 79 200</text>
  <rect x="16" y="228" width="648" height="36" fill="#22C55E" fill-opacity="0.1" stroke="#22C55E" stroke-opacity="0.35"/>
  <text x="24" y="250" fill="#86EFAC" font-family="system-ui,sans-serif" font-size="10">Support 77 800</text>
  <polyline fill="url(#areaUp)" stroke="none"
    points="16,220 80,210 140,225 200,190 260,200 320,165 380,175 440,140 500,155 560,125 620,138 664,118 664,248 16,248"/>
  <polyline fill="none" stroke="#004F6E" stroke-width="2.5" stroke-linejoin="round"
    points="16,220 80,210 140,225 200,190 260,200 320,165 380,175 440,140 500,155 560,125 620,138 664,118"/>
</svg>`;

export type SvgDimensions = { width: number; height: number };

export function parseSvgDimensions(source: string): SvgDimensions {
  const viewBox = source.match(/viewBox=["']([^"']+)["']/i);
  if (viewBox) {
    const parts = viewBox[1].split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      return { width: Math.round(parts[2]), height: Math.round(parts[3]) };
    }
  }
  const w = source.match(/\bwidth=["']([\d.]+)/i);
  const h = source.match(/\bheight=["']([\d.]+)/i);
  return {
    width: w ? Math.round(Number(w[1])) : 680,
    height: h ? Math.round(Number(h[1])) : 320,
  };
}

export type SvgValidation = { ok: true } | { ok: false; message: string };

export function validateSvgMarkup(source: string): SvgValidation {
  const trimmed = source.trim();
  if (!trimmed) return { ok: false, message: "Code vide." };

  if (typeof DOMParser === "undefined") {
    if (!/<svg[\s>]/i.test(trimmed)) {
      return { ok: false, message: "Racine attendue : élément <svg>." };
    }
    return { ok: true };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(trimmed, "image/svg+xml");
  const err = doc.querySelector("parsererror");
  if (err) {
    const msg = err.textContent?.replace(/\s+/g, " ").trim();
    return { ok: false, message: msg || "Erreur XML/SVG." };
  }

  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== "svg") {
    return { ok: false, message: "Racine attendue : élément <svg>." };
  }

  return { ok: true };
}

export function sanitizeSvgForPreview(source: string): string {
  if (typeof DOMParser === "undefined") return source;
  const parser = new DOMParser();
  const doc = parser.parseFromString(source.trim(), "image/svg+xml");
  doc.querySelectorAll("script, foreignObject").forEach((n) => n.remove());
  return new XMLSerializer().serializeToString(doc.documentElement);
}

export function downloadTextFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function svgToPngBlob(svgSource: string, scale = 2): Promise<Blob> {
  const sanitized = sanitizeSvgForPreview(svgSource);
  const blob = new Blob([sanitized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Impossible de rasteriser le SVG."));
      image.src = url;
    });

    const viewBoxMatch = sanitized.match(/viewBox=["']([^"']+)["']/i);
    let width = img.naturalWidth || 800;
    let height = img.naturalHeight || 420;
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].split(/\s+/).map(Number);
      if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
        width = parts[2];
        height = parts[3];
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponible.");
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export PNG échoué."))), "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function svgToJpegBlob(svgSource: string, scale = 2, quality = 0.92): Promise<Blob> {
  const sanitized = sanitizeSvgForPreview(svgSource);
  const blob = new Blob([sanitized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Impossible de rasteriser le SVG."));
      image.src = url;
    });

    const viewBoxMatch = sanitized.match(/viewBox=["']([^"']+)["']/i);
    let width = img.naturalWidth || 800;
    let height = img.naturalHeight || 420;
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].split(/\s+/).map(Number);
      if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
        width = parts[2];
        height = parts[3];
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponible.");
    ctx.fillStyle = "#0B1220";
    ctx.fillRect(0, 0, width * scale, height * scale);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Export JPEG échoué."))),
        "image/jpeg",
        quality
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function extractSvgFromAiResponse(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/```(?:xml|svg)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const svgStart = text.indexOf("<svg");
  const svgEnd = text.lastIndexOf("</svg>");
  if (svgStart >= 0 && svgEnd > svgStart) {
    text = text.slice(svgStart, svgEnd + 6);
  }
  return text;
}

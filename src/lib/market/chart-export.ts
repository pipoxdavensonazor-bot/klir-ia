import type { MarketSnapshot } from "@/lib/market/types";
import { svgToJpegBlob, svgToPngBlob } from "@/lib/studio/svg-studio";

function formatPrice(snapshot: MarketSnapshot): string {
  const decimals = snapshot.assetClass === "forex" ? 4 : snapshot.assetClass === "crypto" ? 2 : 2;
  const formatted = snapshot.priceUsd.toLocaleString("fr-CA", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  if (snapshot.assetClass === "forex") return `${formatted} ${snapshot.currency}`;
  if (snapshot.currency === "USD") return `${formatted} $`;
  return `${formatted} ${snapshot.currency}`;
}

function formatChange(pct: number | null): string {
  if (pct == null) return "n/d · 24h";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)} % · 24h`;
}

/** Points synthétiques low → prix (tendance 24h) pour l'export visuel. */
function buildChartPoints(snapshot: MarketSnapshot): string {
  const low = snapshot.low24hUsd ?? snapshot.priceUsd * 0.98;
  const high = snapshot.high24hUsd ?? snapshot.priceUsd * 1.02;
  const price = snapshot.priceUsd;
  const change = snapshot.change24hPct ?? 0;
  const yBase = 248;
  const yTop = 118;
  const span = yBase - yTop;

  const toY = (v: number) => {
    const range = high - low || 1;
    const t = (v - low) / range;
    return Math.round(yBase - t * span);
  };

  const xs = [16, 70, 124, 178, 232, 286, 340, 394, 448, 502, 556, 610, 664];
  const values = xs.map((_, i) => {
    const t = i / (xs.length - 1);
    const wave = Math.sin(t * Math.PI * 2.2) * (high - low) * 0.08;
    const trend = low + (price - low) * t + (change >= 0 ? t * (high - price) * 0.15 : t * (low - price) * 0.15);
    return Math.min(high, Math.max(low, trend + wave));
  });

  const line = xs.map((x, i) => `${x},${toY(values[i])}`).join(" ");
  const area = `${line} 664,${yBase} 16,${yBase}`;
  return `${line}|${area}|${toY(low)}|${toY(high)}`;
}

export function snapshotToChartSvg(snapshot: MarketSnapshot): string {
  const pairLabel =
    snapshot.assetClass === "forex"
      ? `${snapshot.symbol}`
      : `${snapshot.name} / ${snapshot.currency === "USD" ? "USD" : snapshot.currency}`;
  const price = formatPrice(snapshot);
  const change = snapshot.change24hPct;
  const changeLabel = formatChange(change);
  const changeColor = change == null ? "#94A3B8" : change >= 0 ? "#22C55E" : "#EF4444";
  const [linePts, areaPts, supportY, resistanceY] = buildChartPoints(snapshot).split("|");

  const support =
    snapshot.low24hUsd != null
      ? `<rect x="16" y="${Number(supportY) - 8}" width="648" height="32" fill="#22C55E" fill-opacity="0.1" stroke="#22C55E" stroke-opacity="0.35"/>
  <text x="24" y="${Number(supportY) + 10}" fill="#86EFAC" font-family="system-ui,sans-serif" font-size="10">Support ${snapshot.low24hUsd.toLocaleString("fr-CA", { maximumFractionDigits: snapshot.assetClass === "forex" ? 4 : 2 })}</text>`
      : "";

  const resistance =
    snapshot.high24hUsd != null
      ? `<rect x="16" y="${Number(resistanceY) - 28}" width="648" height="32" fill="#EF4444" fill-opacity="0.1" stroke="#EF4444" stroke-opacity="0.35"/>
  <text x="24" y="${Number(resistanceY) - 6}" fill="#FCA5A5" font-family="system-ui,sans-serif" font-size="10">Résistance ${snapshot.high24hUsd.toLocaleString("fr-CA", { maximumFractionDigits: snapshot.assetClass === "forex" ? 4 : 2 })}</text>`
      : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 320" width="680" height="320">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#0B1220"/>
    </linearGradient>
    <linearGradient id="areaUp" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${changeColor}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${changeColor}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="680" height="320" fill="url(#bg)" rx="12"/>
  <text x="20" y="28" fill="#94A3B8" font-family="system-ui,sans-serif" font-size="12" font-weight="600">${escapeXml(pairLabel)}</text>
  <text x="20" y="58" fill="#F8FAFC" font-family="system-ui,sans-serif" font-size="26" font-weight="700">${escapeXml(price)}</text>
  <text x="20" y="78" fill="${changeColor}" font-family="system-ui,sans-serif" font-size="11">${escapeXml(changeLabel)}</text>
  <text x="560" y="28" fill="#64748B" font-family="system-ui,sans-serif" font-size="10" text-anchor="end">TradingView · Klir IA</text>
  <line x1="16" y1="248" x2="664" y2="248" stroke="#1E293B" stroke-width="1"/>
  <line x1="16" y1="198" x2="664" y2="198" stroke="#1E293B" stroke-width="1"/>
  <line x1="16" y1="148" x2="664" y2="148" stroke="#1E293B" stroke-width="1"/>
  <line x1="16" y1="98" x2="664" y2="98" stroke="#1E293B" stroke-width="1"/>
  ${resistance}
  ${support}
  <polyline fill="url(#areaUp)" stroke="none" points="${areaPts}"/>
  <polyline fill="none" stroke="#004F6E" stroke-width="2.5" stroke-linejoin="round" points="${linePts}"/>
  <text x="20" y="308" fill="#64748B" font-family="system-ui,sans-serif" font-size="9">Informatif — pas conseil financier · ${escapeXml(snapshot.source)}</text>
</svg>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugSymbol(snapshot: MarketSnapshot): string {
  return snapshot.symbol.replace(/[^\w.-]+/g, "-").toLowerCase() || "chart";
}

export async function downloadSnapshotPng(snapshot: MarketSnapshot, scale = 2): Promise<void> {
  const svg = snapshotToChartSvg(snapshot);
  const blob = await svgToPngBlob(svg, scale);
  triggerDownload(blob, `klir-tradingview-${slugSymbol(snapshot)}.png`);
}

export async function downloadSnapshotJpeg(snapshot: MarketSnapshot, scale = 2, quality = 0.92): Promise<void> {
  const svg = snapshotToChartSvg(snapshot);
  const blob = await svgToJpegBlob(svg, scale, quality);
  triggerDownload(blob, `klir-tradingview-${slugSymbol(snapshot)}.jpg`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

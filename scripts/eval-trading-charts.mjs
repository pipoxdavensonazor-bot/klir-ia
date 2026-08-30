#!/usr/bin/env node
/**
 * Évaluation affichage graphiques trading — SVG Studio + TradingView mapping.
 *
 * Usage:
 *   node scripts/eval-trading-charts.mjs
 *   node scripts/eval-trading-charts.mjs --base-url https://klirline.io
 *   node scripts/eval-trading-charts.mjs --static-only   # CI (sans fetch prod)
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function parseArgs(argv) {
  const out = {
    baseUrl: process.env.EVAL_BASE_URL || "https://klirline.io",
    staticOnly:
      process.env.EVAL_TRADING_STATIC_ONLY === "1" ||
      process.env.CI === "true" ||
      process.env.GITHUB_ACTIONS === "true",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base-url") out.baseUrl = argv[++i];
    else if (a === "--static-only") out.staticOnly = true;
    else if (a === "--live") out.staticOnly = false;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

function check(name, ok, detail) {
  return { name, pass: ok, detail };
}

function evalSvgTemplate() {
  const src = readFileSync(join(root, "src/lib/studio/svg-studio.ts"), "utf8");
  const match = src.match(/export const DEFAULT_SVG_TEMPLATE = `([\s\S]*?)`;/);
  const svg = match?.[1] ?? "";
  return [
    check("svg-template-exists", svg.length > 200, `${svg.length} chars`),
    check("svg-dimensions-680x320", /viewBox="0 0 680 320"/.test(svg), "viewBox 680×320"),
    check("svg-btc-label", svg.includes("BTC / USD"), "titre BTC / USD"),
    check("svg-price-display", /78\s*641/.test(svg), "prix affiché"),
    check("svg-support-resistance", svg.includes("Support") && svg.includes("Résistance"), "zones S/R"),
    check("svg-polyline-chart", svg.includes("<polyline"), "courbe polyline"),
  ];
}

function evalTradingViewMapping() {
  const src = readFileSync(join(root, "src/lib/market/tradingview.ts"), "utf8");
  return [
    check("tv-binance-btc", src.includes("BINANCE:BTCUSDT"), "mapping BTC"),
    check("tv-forex-fx", src.includes("FX:${ref.from}${ref.to}"), "mapping forex FX:"),
    check("tv-equity-nasdaq", src.includes("NASDAQ:"), "mapping actions NASDAQ"),
    check("tv-chart-component", readFileSync(join(root, "src/components/TradingViewChart.tsx"), "utf8").includes("s3.tradingview.com/tv.js"), "widget tv.js"),
  ];
}

function evalCsp() {
  const cfg = readFileSync(join(root, "next.config.ts"), "utf8");
  return [
    check("csp-tradingview-script", cfg.includes("https://s3.tradingview.com"), "CSP script TradingView"),
  ];
}

function evalStaticStudioUi() {
  const src = readFileSync(join(root, "src/components/SvgVisualStudio.tsx"), "utf8");
  return [
    check("static-wireframe-code", /\bCode\b/.test(src), "panneau Code"),
    check("static-wireframe-preview", /Live preview/i.test(src), "panneau Live preview"),
    check("static-status-valid", /SVG Valid|SVG invalide/i.test(src), "barre statut SVG"),
    check("static-zoom-control", /Zoom/i.test(src), "contrôle Zoom"),
    check("static-background-control", /Background/i.test(src), "contrôle Background"),
    check("static-export-png", /Export PNG/i.test(src), "export PNG"),
    check("static-export-jpeg", /Export JPEG/i.test(src), "export JPEG"),
    check(
      "static-tradingview-mention",
      /TradingView|trading/i.test(src),
      "mention trading/TradingView"
    ),
  ];
}

function evalStaticMarketApi() {
  const route = readFileSync(join(root, "src/app/api/market/analyze/route.ts"), "utf8");
  return [
    check("static-market-route", route.includes("export async function GET"), "route GET metadata"),
    check("static-market-examples", route.includes('"BTC"'), "exemples BTC"),
    check("static-market-disclaimer", route.includes("disclaimer"), "disclaimer présent"),
  ];
}

async function evalLivePage(baseUrl) {
  const url = `${baseUrl.replace(/\/$/, "")}/studio/svg`;
  try {
    const res = await fetch(url, { headers: { Accept: "text/html" } });
    const html = await res.text();
    return [
      check("live-studio-http", res.ok, `HTTP ${res.status}`),
      check("live-wireframe-code", html.includes("Code") || html.includes("code"), "panneau Code"),
      check("live-wireframe-preview", /Live preview|aperçu/i.test(html), "panneau Live preview"),
      check("live-status-valid", /SVG Valid|SVG invalide/i.test(html), "barre statut SVG"),
      check("live-zoom-control", /Zoom/i.test(html), "contrôle Zoom"),
      check("live-background-control", /Background|Sombre|Damier/i.test(html), "contrôle Background"),
      check("live-export-png", /Export PNG|PNG/i.test(html), "export PNG"),
      check("live-export-jpeg", /Export JPEG|JPEG/i.test(html), "export JPEG"),
      check("live-tradingview-mention", /TradingView|trading/i.test(html), "mention trading/TradingView"),
    ];
  } catch (err) {
    return [check("live-studio-fetch", false, err instanceof Error ? err.message : String(err))];
  }
}

async function evalMarketApi(baseUrl) {
  const url = `${baseUrl.replace(/\/$/, "")}/api/market/analyze`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return [
      check("market-api-get", res.ok, `HTTP ${res.status}`),
      check("market-api-examples", Array.isArray(data.examples) && data.examples.includes("BTC"), "exemples BTC"),
      check("market-api-disclaimer", typeof data.disclaimer === "string" && data.disclaimer.length > 10, "disclaimer présent"),
    ];
  } catch (err) {
    return [check("market-api-fetch", false, err instanceof Error ? err.message : String(err))];
  }
}

function printReport(results, mode) {
  const passed = results.filter((r) => r.pass).length;
  console.log("\n══════════════════════════════════════");
  console.log(" Klir IA — Éval graphiques trading");
  console.log(` Mode     : ${mode}`);
  console.log("══════════════════════════════════════\n");

  for (const r of results) {
    console.log(`[${r.pass ? "PASS" : "FAIL"}] ${r.name} — ${r.detail}`);
  }

  const rate = results.length ? passed / results.length : 0;
  const gateOk = rate >= 0.9;
  console.log("\n──────────────────────────────────────");
  console.log(`Pass rate : ${(rate * 100).toFixed(0)}% (${passed}/${results.length})`);
  console.log(`Gate      : ${gateOk ? "SHIP" : "NO-SHIP"}`);
  console.log("──────────────────────────────────────\n");
  return gateOk;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: node scripts/eval-trading-charts.mjs [--base-url URL] [--static-only|--live]");
    process.exit(0);
  }

  const mode = args.staticOnly ? "static (CI)" : "full (live prod)";
  console.log(`Base URL : ${args.baseUrl}`);
  console.log(`Mode     : ${mode}`);

  const results = [
    ...evalSvgTemplate(),
    ...evalTradingViewMapping(),
    ...evalCsp(),
    ...(args.staticOnly
      ? [...evalStaticStudioUi(), ...evalStaticMarketApi()]
      : [...(await evalLivePage(args.baseUrl)), ...(await evalMarketApi(args.baseUrl))]),
  ];

  const gateOk = printReport(results, mode);

  const outDir = join(root, "evals", "results");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = join(outDir, `trading-charts-${stamp}.json`);
  writeFileSync(
    outFile,
    JSON.stringify({ baseUrl: args.baseUrl, mode, at: new Date().toISOString(), gateOk, results }, null, 2)
  );
  console.log(`Rapport : ${outFile}`);

  process.exit(gateOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

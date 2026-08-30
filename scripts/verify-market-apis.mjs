#!/usr/bin/env node
/**
 * Vérifie les endpoints marché Klir IA (prod ou local).
 * Usage: node scripts/verify-market-apis.mjs [baseUrl]
 */
const base = (process.argv[2] || "https://klirline.io").replace(/\/$/, "");

const tests = [
  { name: "connections", method: "GET", path: "/api/market/connections" },
  { name: "BTC snapshot", method: "GET", path: "/api/market/snapshot?symbol=BTC" },
  { name: "EUR/USD snapshot", method: "GET", path: "/api/market/snapshot?symbol=EUR%2FUSD" },
  { name: "AAPL snapshot", method: "GET", path: "/api/market/snapshot?symbol=AAPL" },
  {
    name: "analyze meta",
    method: "GET",
    path: "/api/market/analyze",
  },
];

async function runOne(t) {
  const url = `${base}${t.path}`;
  try {
    const res = await fetch(url, {
      method: t.method,
      headers: t.body ? { "Content-Type": "application/json" } : undefined,
      body: t.body,
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { _raw: text.slice(0, 120) };
    }
    const ok = res.ok;
    return { ...t, status: res.status, ok, json };
  } catch (err) {
    return { ...t, status: 0, ok: false, error: err.message };
  }
}

console.log(`\nKlir IA — vérification marché @ ${base}\n`);

const results = [];
for (const t of tests) {
  const r = await runOne(t);
  results.push(r);
  const icon = r.ok ? "OK" : "FAIL";
  console.log(`[${icon}] ${r.name} → HTTP ${r.status}`);
  if (r.json?.connections) {
    for (const c of r.json.connections) {
      console.log(`      ${c.id}: ${c.available ? "actif" : "inactif"} — ${c.note}`);
    }
  }
  if (r.json?.snapshot) {
    const s = r.json.snapshot;
    console.log(`      ${s.symbol} @ ${s.priceUsd} (${s.source})`);
  }
  if (r.json?.error) console.log(`      erreur: ${r.json.error}`);
  if (r.error) console.log(`      ${r.error}`);
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} endpoints OK\n`);
process.exit(passed === results.length ? 0 : 1);

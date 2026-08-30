#!/usr/bin/env node
/**
 * Crée les 3 Products/Prices Stripe (forfaits pass) et pousse STRIPE_PRICE_PASS* sur Worker.
 * Lit STRIPE_SECRET_KEY depuis KEYS API.env.txt
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const keysPath = path.join(root, "KEYS API.env.txt");

const text = fs.readFileSync(keysPath, "utf8");
const m = text.match(/STRIPE_SECRET_KEY\s*=\s*(\S+)/);
if (!m) {
  console.error("STRIPE_SECRET_KEY introuvable dans KEYS API.env.txt");
  process.exit(1);
}
const secret = m[1].trim();
if (!secret.startsWith("sk_")) {
  console.error("STRIPE_SECRET_KEY invalide (attendu sk_…)");
  process.exit(1);
}

const passes = [
  { env: "STRIPE_PRICE_PASS24H", name: "Klir IA — 24 heures", amount: 200, planId: "pass24h" },
  { env: "STRIPE_PRICE_PASS7D", name: "Klir IA — 1 semaine", amount: 400, planId: "pass7d" },
  { env: "STRIPE_PRICE_PASS30D", name: "Klir IA — 1 mois", amount: 1900, planId: "pass30d" },
];

const created = {};

for (const p of passes) {
  const body = new URLSearchParams();
  body.set("name", p.name);
  body.set("description", `Accès illimité Klir IA (${p.planId})`);
  body.set("metadata[plan_id]", p.planId);
  body.set("default_price_data[currency]", "usd");
  body.set("default_price_data[unit_amount]", String(p.amount));
  body.set("default_price_data[tax_behavior]", "exclusive");

  const res = await fetch("https://api.stripe.com/v1/products", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`FAIL ${p.env}:`, data.error?.message || JSON.stringify(data).slice(0, 240));
    process.exit(1);
  }
  const priceId =
    typeof data.default_price === "string" ? data.default_price : data.default_price?.id;
  if (!priceId || !String(priceId).startsWith("price_")) {
    console.error(`Pas de price_ sur le produit ${p.env}`);
    process.exit(1);
  }
  created[p.env] = priceId;
  console.log(`OK ${p.env} → ${priceId.slice(0, 14)}… (${p.amount / 100} USD)`);
}

for (const [key, val] of Object.entries(created)) {
  console.log(`🔐 ${key}…`);
  const r = spawnSync("npx", ["wrangler", "secret", "put", key], {
    input: val,
    stdio: ["pipe", "inherit", "inherit"],
    shell: true,
    cwd: root,
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

console.log("\n✅ Prices forfaits créés + secrets Worker");

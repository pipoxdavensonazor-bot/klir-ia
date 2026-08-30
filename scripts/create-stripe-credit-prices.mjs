#!/usr/bin/env node
/**
 * Crée les 3 Products/Prices Stripe (crédits) et pousse STRIPE_PRICE_* sur Worker.
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

const packs = [
  {
    env: "STRIPE_PRICE_PACK1500",
    name: "Klir IA — 1 500 crédits",
    amount: 990,
    credits: 1500,
  },
  {
    env: "STRIPE_PRICE_PACK5000",
    name: "Klir IA — 5 000 crédits",
    amount: 2000,
    credits: 5000,
  },
  {
    env: "STRIPE_PRICE_PACK10000",
    name: "Klir IA — 10 000 crédits + support",
    amount: 3900,
    credits: 10000,
  },
];

const created = {};

for (const p of packs) {
  const body = new URLSearchParams();
  body.set("name", p.name);
  body.set("description", `${p.credits} crédits Klir IA`);
  body.set("metadata[credits]", String(p.credits));
  body.set("metadata[plan_id]", p.env.replace("STRIPE_PRICE_", "").toLowerCase());
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

const kept = text
  .split(/\r?\n/)
  .filter((line) => {
    const t = line.trim();
    if (/^STRIPE_PRICE_/i.test(t)) return false;
    return true;
  });

const insertAt = kept.findIndex((l) => /^STRIPE_SECRET_KEY\s*=/.test(l.trim()));
const priceLines = Object.entries(created).map(([k, v]) => `${k}=${v}`);
if (insertAt >= 0) {
  kept.splice(insertAt, 0, ...priceLines, "");
} else {
  kept.push("", ...priceLines);
}
fs.writeFileSync(keysPath, kept.join("\n") + "\n");

console.log("\n✅ Prices créés + secrets Worker + fichier KEYS mis à jour");

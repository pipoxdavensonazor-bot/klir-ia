#!/usr/bin/env node
/**
 * Pousse les secrets vers Worker klir-ia depuis un fichier texte.
 * Format accepté : "npx wrangler secret put KEY : value" ou "KEY=value"
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fileArg = process.argv[2];
if (!fileArg) {
  console.error("Usage: node scripts/put-secrets-from-file.mjs <fichier>");
  process.exit(1);
}

const filePath = path.resolve(fileArg);
if (!fs.existsSync(filePath)) {
  console.error(`Fichier introuvable : ${filePath}`);
  process.exit(1);
}

const ALLOWED = new Set([
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY",
  "OPENROUTER_API_KEY",
  "GROQ_API_KEY",
  "MISTRAL_API_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_PASS24H",
  "STRIPE_PRICE_PASS7D",
  "STRIPE_PRICE_PASS30D",
  "MONCASH_CLIENT_ID",
  "MONCASH_CLIENT_SECRET",
  "MONCASH_BUSINESS_KEY",
  "NOWPAYMENTS_API_KEY",
  "NOWPAYMENTS_IPN_SECRET",
  "USDT_WALLET_ADDRESS",
  "BINANCE_USDT_ADDRESS",
  "USDT_HTG_RATE",
  "TRONGRID_API_KEY",
  "SECURITY_SALT",
  "UNSPLASH_ACCESS_KEY",
  "PEXELS_API_KEY",
  "GEMINI_IMAGE_MODEL",
  "ALPHA_VANTAGE_API_KEY",
  "BINANCE_API_KEY",
  "BINANCE_API_SECRET",
  "ETORO_ACCESS_TOKEN",
  "ETORO_API_KEY",
  "ETORO_USER_KEY",
]);

function parseSecrets(text) {
  const out = {};
  const lower = text.toLowerCase();
  const marker = lower.lastIndexOf("klirline");
  const blocks =
    marker >= 0
      ? [text.slice(marker), text]
      : [text];

  for (const block of blocks) {
    for (const line of block.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("cd ")) continue;

      const clientId = trimmed.match(/^Client Id:\s*(.+)$/i);
      if (clientId) {
        out.MONCASH_CLIENT_ID = clientId[1].trim();
        continue;
      }
      const clientSecret = trimmed.match(/^Client Secret:\s*(.+)$/i);
      if (clientSecret) {
        out.MONCASH_CLIENT_SECRET = clientSecret[1].trim();
        continue;
      }
      const businessKey = trimmed.match(/^Business Key:\s*(.+)$/i);
      if (businessKey) {
        out.MONCASH_BUSINESS_KEY = businessKey[1].trim();
        continue;
      }

      const wrangler = trimmed.match(
        /wrangler\s+secret\s+put\s+([A-Z_]+)\s*:?\s*(.+)$/i
      );
      if (wrangler) {
        const [, key, val] = wrangler;
        if (ALLOWED.has(key) && val.trim()) out[key] = val.trim();
        continue;
      }

      const colon = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*:\s*(.+)$/);
      if (colon && ALLOWED.has(colon[1]) && colon[2].trim()) {
        out[colon[1]] = colon[2].trim();
        continue;
      }

      const eq = trimmed.match(/^([A-Z_]+)=(.+)$/);
      if (eq && ALLOWED.has(eq[1]) && eq[2].trim()) out[eq[1]] = eq[2].trim();
    }
    if (out.MONCASH_CLIENT_ID && out.MONCASH_CLIENT_SECRET) break;
  }
  return out;
}

function validateSecret(key, val) {
  if (key.startsWith("STRIPE_PRICE_") && !val.startsWith("price_")) {
    console.error(
      `⏭  ${key} ignoré : attendu price_… (reçu ${val.slice(0, 8)}…). Ce n’est pas un Price ID Stripe.`
    );
    return false;
  }
  if (key === "STRIPE_WEBHOOK_SECRET" && !val.startsWith("whsec_")) {
    console.error(`⏭  ${key} ignoré : attendu whsec_…`);
    return false;
  }
  return true;
}

const secrets = parseSecrets(fs.readFileSync(filePath, "utf8"));
let pushed = 0;
const skipped = [];

for (const [key, val] of Object.entries(secrets)) {
  if (!validateSecret(key, val)) {
    skipped.push(key);
    continue;
  }
  console.log(`🔐 ${key}…`);
  const r = spawnSync("npx", ["wrangler", "secret", "put", key], {
    input: val,
    stdio: ["pipe", "inherit", "inherit"],
    shell: true,
    cwd: path.join(__dirname, ".."),
  });
  if (r.status === 0) pushed++;
  else console.error(`❌ Échec ${key}`);
}

const absent = [...ALLOWED].filter((k) => !secrets[k]);
if (absent.length) console.log(`\n⏭  Absents du fichier : ${absent.join(", ")}`);
if (skipped.length) console.log(`⏭  Ignorés (format invalide) : ${skipped.join(", ")}`);

console.log(`\n✅ ${pushed} secret(s) configuré(s) sur Worker klir-ia`);

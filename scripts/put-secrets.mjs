#!/usr/bin/env node
/**
 * Configure les secrets Cloudflare Worker klir-ia (interactive).
 * Usage: node scripts/put-secrets.mjs
 *
 * Secrets supportés :
 * OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY,
 * OPENROUTER_API_KEY, GROQ_API_KEY, MISTRAL_API_KEY
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");

const SECRETS = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY",
  "OPENROUTER_API_KEY",
  "GROQ_API_KEY",
  "MISTRAL_API_KEY",
];

function loadEnv() {
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && m[2].trim()) out[m[1]] = m[2].trim();
  }
  return out;
}

const env = loadEnv();
let pushed = 0;

for (const key of SECRETS) {
  const val = env[key];
  if (!val) {
    console.log(`⏭  ${key} — absent de .env, ignoré`);
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

console.log(`\n✅ ${pushed} secret(s) configuré(s) sur Worker klir-ia`);
